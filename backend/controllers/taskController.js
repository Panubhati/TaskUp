const Task = require('../models/Task');
const Groq = require('groq-sdk');

/* ── Active solver tracking (in-memory) ── */
// Map<taskId, Map<userId, lastHeartbeat>>
const activeSolvers = new Map();
const SOLVER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function cleanExpiredSolvers(taskId) {
  const solvers = activeSolvers.get(taskId);
  if (!solvers) return 0;
  const now = Date.now();
  for (const [uid, ts] of solvers) {
    if (now - ts > SOLVER_TIMEOUT) solvers.delete(uid);
  }
  return solvers.size;
}

/* ── Helpers ── */
function parseJson(text, type = 'object') {
  const cleaned = text.trim().replace(/^```(?:json)?\n?/gi, '').replace(/\n?```$/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = cleaned.match(pattern);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse AI response');
  }
}

/* ── Programmatic syntax pre-check ── */
function syntaxPreCheck(code, language) {
  const errors = [];
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const closers = new Set([')', ']', '}']);
  let inString = false, stringChar = '', inLineComment = false, inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1] || '';
    if (ch === '\n') { inLineComment = false; continue; }
    if (inLineComment) continue;
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (!inString && ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (!inString && ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (!inString && ch === '#' && ['python', 'py'].includes(language.toLowerCase())) { inLineComment = true; continue; }
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) { inString = true; stringChar = ch; continue; }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) { inString = false; }
      continue;
    }
    if (pairs[ch]) { stack.push({ char: ch, pos: i }); }
    else if (closers.has(ch)) {
      if (stack.length === 0) errors.push(`Unexpected '${ch}'`);
      else { const top = stack.pop(); if (pairs[top.char] !== ch) errors.push(`Mismatched '${ch}'`); }
    }
  }
  if (inString) errors.push('Unterminated string literal');
  if (inBlockComment) errors.push('Unterminated block comment');
  while (stack.length > 0) { const u = stack.pop(); errors.push(`Unclosed '${u.char}'`); }
  return errors;
}

async function groqCall(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a strict code compiler and interpreter. You must evaluate code EXACTLY as written — never auto-correct, never assume missing code, never be lenient. If code has ANY syntax error (missing semicolons, unclosed brackets, incomplete conditions, etc.), it MUST fail. Always respond with raw JSON only — no markdown, no explanation, no code fences.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 2048,
  });
  return response.choices[0]?.message?.content || '';
}

/* ── AI: Evaluate correctness ── */
async function evaluateCorrectness(code, language, testCases) {
  const tcText = testCases.map((tc, i) =>
    `Test ${i + 1}:\n  stdin: ${tc.input}\n  expected stdout: ${tc.expectedOutput}`
  ).join('\n\n');

  const prompt = `You are a strict code compiler/interpreter. Evaluate the following ${language} code against each test case.

CRITICAL RULES — YOU MUST FOLLOW ALL OF THESE:
1. SYNTAX CHECK FIRST: Before tracing any logic, check for syntax errors:
   - Missing semicolons (in C, C++, Java, JavaScript)
   - Missing or mismatched brackets, braces, parentheses
   - Incomplete if/else/for/while conditions or missing bodies
   - Missing return statements, unclosed strings, incomplete function signatures
2. If ANY syntax error exists, ALL test cases MUST fail. Set pass=false with the error.
3. DO NOT auto-correct or assume missing code. Evaluate EXACTLY as written.
4. DO NOT be lenient — a real compiler rejects syntax errors, so must you.
5. Trace code line-by-line like a real ${language} compiler/interpreter.
6. Compare actual stdout to expected (trim trailing whitespace). pass=true ONLY if exact match.
7. Runtime errors (null pointer, index out of bounds, etc.) → pass=false with the error.

Code:
\`\`\`${language}
${code}
\`\`\`

Test cases:
${tcText}

Respond with ONLY this raw JSON array:
[{"index":0,"actual":"<stdout or empty if error>","pass":<bool>,"error":"<error description or null>"}]`;

  const text = await groqCall(prompt);
  return parseJson(text, 'array');
}

/* ── AI: Evaluate optimization + provide feedback ── */
async function evaluateOptimizationAndFeedback(code, language, description) {
  const prompt = `Analyze this ${language} code for a coding challenge.

Problem description: ${description || 'N/A'}

Code:
\`\`\`${language}
${code}
\`\`\`

Evaluate:
1. Time complexity (Big O)
2. Space complexity (Big O)
3. Optimization score from 0-100 (100 = perfectly optimal)
4. Brief optimization notes (1-2 lines max)
5. Concise improvement feedback in 3-7 lines ONLY: key improvements, a better approach if any, and one edge case to watch for. Do NOT write more than 7 lines.

Respond with ONLY this JSON:
{"timeComplexity":"O(...)","spaceComplexity":"O(...)","score":0,"notes":"1-2 line optimization notes","feedback":"3-7 lines of concise improvement feedback"}`;
  const text = await groqCall(prompt);
  return parseJson(text, 'object');
}

/* ═══════════ Controllers ═══════════ */

const createTask = async (req, res) => {
  const { title, description, examples, testCases } = req.body;

  try {
    if (!Array.isArray(examples) || !examples.length) {
      return res.status(400).json({ error: 'Examples are required' });
    }
    if (!Array.isArray(testCases) || !testCases.length) {
      return res.status(400).json({ error: 'Test cases are required' });
    }

    const task = new Task({
      title,
      description,
      examples,
      testCases,
      author: req.user.id,
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('Error saving task:', error);
    res.status(400).json({ error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const filter = {};
    // Companies only see their own tasks
    if (req.user?.role === 'company') {
      filter.author = req.user.id;
    }
    const tasks = await Task.find(filter)
      .select('-submissions')
      .populate('author', 'username');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Add stats
    const uniqueSubmitters = new Set(task.submissions.map(s => s.user.toString())).size;
    const currentlySolving = cleanExpiredSolvers(task._id.toString());
    const taskObj = task.toObject();
    taskObj.stats = { totalSolved: uniqueSubmitters, activeSolvers: currentlySolving };
    res.json(taskObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const evaluateSubmission = async (req, res) => {
  const { code, taskId, language, timeTakenSeconds } = req.body;
  const userId = req.user.id;

  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const userSubmissions = task.submissions.filter(sub => sub.user.toString() === userId.toString());
    if (userSubmissions.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 submissions allowed per task. You have used all 3.' });
    }

    // Programmatic syntax pre-check
    const syntaxErrors = syntaxPreCheck(code, language || 'javascript');
    if (syntaxErrors.length > 0) {
      const errorMsg = 'Syntax Error: ' + syntaxErrors.join('; ');
      const submission = {
        user: userId,
        code: code || '',
        language: language || 'javascript',
        score: 0,
        testCasesPassed: 0,
        totalTestCases: task.testCases.length,
        status: 'evaluated',
        timeTakenSeconds: timeTakenSeconds || 0,
        aiAnalysis: {
          timeComplexity: 'N/A',
          spaceComplexity: 'N/A',
          optimizationNotes: errorMsg,
          feedback: 'Your code has syntax errors. Please fix them before resubmitting: ' + syntaxErrors.join(', '),
        },
      };
      task.submissions.push(submission);
      await task.save();

      return res.json({
        success: true,
        score: 0,
        submission: {
          code: submission.code,
          language: submission.language,
          score: 0,
          testCasesPassed: 0,
          totalTestCases: task.testCases.length,
          aiAnalysis: submission.aiAnalysis,
          testResults: task.testCases.map((_, i) => ({
            index: i, actual: '', pass: false, error: errorMsg,
          })),
        },
      });
    }

    console.log(`[AI] Evaluating task submission for "${task.title}"...`);

    // 1. Correctness evaluation
    let correctnessResults;
    try {
      correctnessResults = await evaluateCorrectness(code, language || 'javascript', task.testCases);
    } catch (e) {
      console.error('Correctness eval failed:', e.message);
      correctnessResults = task.testCases.map((_, i) => ({ index: i, pass: false, error: e.message }));
    }

    const passed = correctnessResults.filter(r => r.pass).length;
    const total = task.testCases.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    // 2. Optimization + Feedback analysis
    let analysisResult = { score: 50, timeComplexity: 'N/A', spaceComplexity: 'N/A', notes: '', feedback: '' };
    try {
      analysisResult = await evaluateOptimizationAndFeedback(code, language || 'javascript', task.description);
    } catch (e) {
      console.error('Optimization/feedback eval failed:', e.message);
    }

    const submission = {
      user: userId,
      code: code || '',
      language: language || 'javascript',
      score,
      testCasesPassed: passed,
      totalTestCases: total,
      status: 'evaluated',
      timeTakenSeconds: timeTakenSeconds || 0,
      aiAnalysis: {
        timeComplexity: analysisResult.timeComplexity || 'N/A',
        spaceComplexity: analysisResult.spaceComplexity || 'N/A',
        optimizationNotes: analysisResult.notes || '',
        feedback: analysisResult.feedback || '',
      },
    };

    task.submissions.push(submission);
    await task.save();

    res.json({
      success: true,
      score,
      submission: {
        code: submission.code,
        language: submission.language,
        score,
        testCasesPassed: passed,
        totalTestCases: total,
        aiAnalysis: submission.aiAnalysis,
        testResults: correctnessResults.map((r, i) => ({
          index: i,
          input: task.testCases[i]?.input || '',
          expected: task.testCases[i]?.expectedOutput || '',
          actual: (r.actual ?? '').trim(),
          pass: r.pass ?? false,
          error: r.error ?? null,
        })),
      },
    });
  } catch (error) {
    console.error('Task submission error:', error);
    res.status(500).json({ error: 'Error evaluating submission: ' + error.message });
  }
};

// GET /api/tasks/:id/submissions — Company views all user submissions
const getTaskSubmissions = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('submissions.user', 'username email')
      .populate('author', 'username');
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Only the company that created the task can view its submissions
    if (task.author._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only view submissions for your own tasks.' });
    }

    const submissions = task.submissions.map(sub => ({
      _id: sub._id,
      user: sub.user,
      code: sub.code,
      language: sub.language,
      score: sub.score,
      testCasesPassed: sub.testCasesPassed,
      totalTestCases: sub.totalTestCases,
      status: sub.status,
      timeTakenSeconds: sub.timeTakenSeconds || 0,
      submittedAt: sub.submittedAt,
      aiAnalysis: sub.aiAnalysis,
    })).sort((a, b) => b.score - a.score);

    res.json({
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        author: task.author,
        testCasesCount: task.testCases?.length || 0,
      },
      submissions,
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/tasks/:id/my-submissions — Student views their own submissions
const getMySubmissions = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const userId = req.user.id;
    const mySubmissions = task.submissions
      .filter(sub => sub.user.toString() === userId.toString())
      .map(sub => ({
        _id: sub._id,
        code: sub.code,
        language: sub.language,
        score: sub.score,
        testCasesPassed: sub.testCasesPassed,
        totalTestCases: sub.totalTestCases,
        status: sub.status,
        timeTakenSeconds: sub.timeTakenSeconds || 0,
        submittedAt: sub.submittedAt,
        aiAnalysis: sub.aiAnalysis,
      }))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({ submissions: mySubmissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/tasks/:id/heartbeat — Track active solver
const solverHeartbeat = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  if (!activeSolvers.has(taskId)) activeSolvers.set(taskId, new Map());
  activeSolvers.get(taskId).set(userId, Date.now());
  const count = cleanExpiredSolvers(taskId);
  res.json({ activeSolvers: count });
};

// POST /api/tasks/:id/leave — Remove active solver
const solverLeave = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  if (activeSolvers.has(taskId)) {
    activeSolvers.get(taskId).delete(userId);
  }
  res.json({ success: true });
};

module.exports = { createTask, getTasks, getTaskById, evaluateSubmission, getTaskSubmissions, getMySubmissions, solverHeartbeat, solverLeave };