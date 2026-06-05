const Assignment = require('../models/Assignment');
const Question = require('../models/Question');
const Groq = require('groq-sdk');

/* ── Active solver tracking (in-memory) ── */
const activeSolvers = new Map();
const SOLVER_TIMEOUT = 5 * 60 * 1000;

function cleanExpiredSolvers(assignmentId) {
  const solvers = activeSolvers.get(assignmentId);
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
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

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

    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true; stringChar = ch; continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) { inString = false; }
      continue;
    }

    if (pairs[ch]) {
      stack.push({ char: ch, pos: i });
    } else if (closers.has(ch)) {
      if (stack.length === 0) {
        errors.push(`Unexpected '${ch}'`);
      } else {
        const top = stack.pop();
        if (pairs[top.char] !== ch) {
          errors.push(`Mismatched '${ch}'`);
        }
      }
    }
  }

  if (inString) errors.push('Unterminated string literal');
  if (inBlockComment) errors.push('Unterminated block comment');
  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push(`Unclosed '${unclosed.char}'`);
  }

  return errors;
}

async function groqCall(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a strict code compiler and interpreter. You must evaluate code EXACTLY as written — never auto-correct, never assume missing code, never be lenient. If code has ANY syntax error (missing semicolons, unclosed brackets, incomplete conditions, etc.), it MUST fail. Always respond with raw JSON only — no markdown, no explanation.' },
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
    `Test ${i + 1}:\n  stdin: ${tc.input}\n  expected: ${tc.expectedOutput}`
  ).join('\n\n');

  const prompt = `You are a strict code compiler/interpreter. Evaluate the following ${language} code against each test case.

CRITICAL RULES — YOU MUST FOLLOW ALL OF THESE:
1. SYNTAX CHECK FIRST: Before tracing any logic, perform a full syntax check on the code. Look for:
   - Missing semicolons (in languages that require them: C, C++, Java, JavaScript)
   - Missing or mismatched brackets, braces, parentheses
   - Incomplete if/else/for/while conditions or missing condition bodies
   - Missing return statements where required
   - Unclosed strings or quotes
   - Missing function declarations or incomplete function signatures
   - Any other syntax error that a real compiler/interpreter would catch
2. If ANY syntax error is found, ALL test cases MUST fail. Set pass=false and put the syntax error in the "error" field.
3. DO NOT auto-correct, assume, or fill in missing code. Evaluate the code EXACTLY as written.
4. DO NOT be lenient. A real compiler would reject code with syntax errors — you must do the same.
5. Trace the code line-by-line like a real ${language} compiler/interpreter would execute it.
6. Compare actual stdout output to expected output (trim trailing whitespace only). Set pass=true ONLY if they match exactly.
7. If the code would cause a runtime error (null pointer, index out of bounds, infinite loop, etc.), set pass=false with the error.

Code:
\`\`\`${language}
${code}
\`\`\`

Test cases:
${tcText}

Respond with ONLY this JSON array (no explanation, no markdown):
[{"index":0,"actual":"<stdout or empty if error>","pass":<bool>,"error":"<syntax/runtime error description or null>"}]`;

  const text = await groqCall(prompt);
  return parseJson(text, 'array');
}

/* ── AI: Evaluate optimization + feedback ── */
async function evaluateOptimization(code, language) {
  const prompt = `Analyze this ${language} code for optimization quality.

Code:
\`\`\`${language}
${code}
\`\`\`

Evaluate:
1. Time complexity (Big O)
2. Space complexity (Big O)
3. Code quality (naming, structure, readability)
4. Optimization score from 0-100 (100 = perfectly optimal)
5. Concise improvement feedback in 3-7 lines ONLY: key improvements, a better approach if any, and one edge case to watch for. Do NOT write more than 7 lines.

Respond with ONLY this JSON:
{"timeComplexity":"O(...)","spaceComplexity":"O(...)","score":0,"notes":"1-2 line optimization notes","feedback":"3-7 lines of concise improvement feedback"}`;

  const text = await groqCall(prompt);
  return parseJson(text, 'object');
}

/* ── AI: Plagiarism + AI-detection check ── */
async function checkPlagiarism(newCode, existingSubmissions, language) {
  // Compare against up to 10 most recent submissions
  let comparisonsBlock = '';
  if (existingSubmissions.length) {
    const comparisons = existingSubmissions.slice(-10).map((sub, i) =>
      `--- Submission ${i + 1} (User: ${sub.user}) ---\n${sub.code}`
    ).join('\n\n');
    comparisonsBlock = `\nEXISTING SUBMISSIONS:\n${comparisons}\n`;
  }

  const prompt = `You are a plagiarism and AI-code detector. Analyze this ${language} code for TWO things:

1. **AI-GENERATED CODE DETECTION**: Check if this code appears to be generated by AI tools like ChatGPT, GitHub Copilot, Gemini, Claude, or similar. Look for these AI signals:
   - Overly verbose/perfect comments explaining every line
   - Unnaturally clean and consistent naming conventions
   - Boilerplate-heavy patterns that AI typically generates
   - Common AI code signatures (e.g. "helper function", generic variable names like "result", "temp", "arr")
   - Suspiciously well-structured code for a timed submission
   - Standard textbook-style solutions copied verbatim
   - Code that looks too polished for a quick coding assessment

2. **SUBMISSION SIMILARITY**: ${existingSubmissions.length ? 'Compare against existing submissions for code copying, structural similarity, variable renaming, and logic duplication. Ignore common patterns like standard library usage.' : 'No existing submissions to compare against.'}

NEW CODE:
\`\`\`${language}
${newCode}
\`\`\`
${comparisonsBlock}
Respond with ONLY this JSON:
{"score":0,"notes":"1-2 line explanation covering both AI detection and similarity findings","aiGenerated":false,"similarSubmissions":[]}
Where score: 0=fully original human code, 100=exact copy or clearly AI-generated. aiGenerated: true if code shows strong AI-generation signals. similarSubmissions: array of indices (1-based) of similar submissions if any.`;

  const text = await groqCall(prompt);
  return parseJson(text, 'object');
}

/* ═══════════ Controllers ═══════════ */

// POST /api/assignments — Company creates assignment from question IDs
const createAssignment = async (req, res) => {
  const { title, description, questionIds, deadline, timeLimitMinutes, maxSubmissions } = req.body;
  try {
    if (!title || !questionIds?.length) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    // Verify all questions exist
    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: 'Some question IDs are invalid' });
    }

    const assignment = new Assignment({
      title,
      description: description || '',
      company: req.user.id,
      questions: questionIds,
      deadline: deadline ? new Date(deadline) : undefined,
      timeLimitMinutes: timeLimitMinutes || 0,
      maxSubmissions: maxSubmissions || 2,
    });

    await assignment.save();
    await assignment.populate('questions', 'title difficulty category tags');
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/assignments — List assignments
const getAssignments = async (req, res) => {
  try {
    const filter = {};
    // If company, show only their assignments
    if (req.user?.role === 'company') {
      filter.company = req.user.id;
    }
    const assignments = await Assignment.find(filter)
      .populate('company', 'username')
      .populate('questions', 'title difficulty category tags')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/assignments/:id — Get assignment detail
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('company', 'username')
      .populate('questions');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Compute stats
    const uniqueSubmitters = new Set(assignment.submissions.map(s => s.user.toString())).size;
    const currentlySolving = cleanExpiredSolvers(assignment._id.toString());
    const stats = { totalSolved: uniqueSubmitters, activeSolvers: currentlySolving };

    // If student, hide test cases from questions
    if (req.user?.role === 'student') {
      const sanitized = assignment.toObject();
      sanitized.questions = sanitized.questions.map(q => {
        const { testCases, ...rest } = q;
        return rest;
      });
      sanitized.stats = stats;
      return res.json(sanitized);
    }

    const assignObj = assignment.toObject();
    assignObj.stats = stats;
    res.json(assignObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/assignments/:id/submit — Student submits solution
const submitSolution = async (req, res) => {
  const { questionId, code, language } = req.body;
  const userId = req.user.id;

  try {
    const assignment = await Assignment.findById(req.params.id).populate('questions');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Check deadline
    if (assignment.deadline && new Date() > assignment.deadline) {
      return res.status(400).json({ error: 'Assignment deadline has passed' });
    }

    // Check if question is part of this assignment
    const question = assignment.questions.find(q => q._id.toString() === questionId);
    if (!question) return res.status(400).json({ error: 'Question not part of this assignment' });

    // Check submission count for this question by this user
    const userSubmissions = assignment.submissions.filter(
      s => s.user.toString() === userId && s.questionId.toString() === questionId
    );
    const maxSubs = assignment.maxSubmissions || 2;
    if (userSubmissions.length >= maxSubs) {
      return res.status(400).json({ error: `Maximum ${maxSubs} submissions allowed per question. You have used all ${maxSubs}.` });
    }

    // Programmatic syntax pre-check — fail immediately if brackets are broken
    const syntaxErrors = syntaxPreCheck(code, language);
    if (syntaxErrors.length > 0) {
      const errorMsg = 'Syntax Error: ' + syntaxErrors.join('; ');
      const submission = {
        user: userId,
        questionId,
        code,
        language,
        correctnessScore: 0,
        optimizationScore: 0,
        plagiarismScore: 0,
        finalScore: 0,
        testCasesPassed: 0,
        totalTestCases: question.testCases.length,
        aiAnalysis: {
          timeComplexity: 'N/A',
          spaceComplexity: 'N/A',
          optimizationNotes: errorMsg,
          plagiarismNotes: '',
          similarTo: [],
        },
      };

      assignment.submissions.push(submission);
      await assignment.save();

      return res.json({
        success: true,
        submission: {
          correctnessScore: 0,
          optimizationScore: 0,
          plagiarismScore: 0,
          finalScore: 0,
          testCasesPassed: 0,
          totalTestCases: question.testCases.length,
          aiAnalysis: submission.aiAnalysis,
          testResults: question.testCases.map((_, i) => ({
            index: i, actual: '', pass: false, error: errorMsg,
          })),
        },
      });
    }

    // AI Evaluation pipeline
    console.log(`[AI] Evaluating submission for ${question.title}...`);

    // 1. Correctness
    let correctnessResults;
    try {
      correctnessResults = await evaluateCorrectness(code, language, question.testCases);
    } catch (e) {
      console.error('Correctness eval failed:', e.message);
      correctnessResults = question.testCases.map((_, i) => ({ index: i, pass: false, error: e.message }));
    }

    const passed = correctnessResults.filter(r => r.pass).length;
    const total = question.testCases.length;
    const correctnessScore = Math.round((passed / total) * 100);

    // 2. Optimization
    let optimizationResult = { score: 50, timeComplexity: 'N/A', spaceComplexity: 'N/A', notes: '' };
    try {
      optimizationResult = await evaluateOptimization(code, language);
    } catch (e) {
      console.error('Optimization eval failed:', e.message);
    }

    // 3. Plagiarism
    const existingSubs = assignment.submissions
      .filter(s => s.questionId.toString() === questionId)
      .map(s => ({ user: s.user.toString(), code: s.code }));

    let plagiarismResult = { score: 0, notes: '', similarSubmissions: [] };
    try {
      plagiarismResult = await checkPlagiarism(code, existingSubs, language);
    } catch (e) {
      console.error('Plagiarism check failed:', e.message);
    }

    // Calculate final score: 50% correctness + 30% optimization + 20% originality
    const originalityScore = Math.max(0, 100 - (plagiarismResult.score || 0));
    const finalScore = Math.round(
      correctnessScore * 0.50 +
      (optimizationResult.score || 50) * 0.30 +
      originalityScore * 0.20
    );

    const submission = {
      user: userId,
      questionId,
      code,
      language,
      correctnessScore,
      optimizationScore: optimizationResult.score || 50,
      plagiarismScore: plagiarismResult.score || 0,
      finalScore,
      testCasesPassed: passed,
      totalTestCases: total,
      aiAnalysis: {
        timeComplexity: optimizationResult.timeComplexity || 'N/A',
        spaceComplexity: optimizationResult.spaceComplexity || 'N/A',
        optimizationNotes: optimizationResult.notes || '',
        feedback: optimizationResult.feedback || '',
        plagiarismNotes: (plagiarismResult.aiGenerated ? '🤖 AI-Generated Code Detected. ' : '') + (plagiarismResult.notes || ''),
        similarTo: [],
      },
    };

    assignment.submissions.push(submission);
    await assignment.save();

    res.json({
      success: true,
      submission: {
        correctnessScore,
        optimizationScore: optimizationResult.score || 50,
        plagiarismScore: plagiarismResult.score || 0,
        finalScore,
        testCasesPassed: passed,
        totalTestCases: total,
        code,
        language,
        aiAnalysis: submission.aiAnalysis,
        testResults: correctnessResults,
      },
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Submission failed: ' + error.message });
  }
};

// GET /api/assignments/:id/leaderboard — Ranked leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions.user', 'username')
      .populate('questions', 'title');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Aggregate scores per user across all questions
    const userScores = {};
    assignment.submissions.forEach(sub => {
      const uid = sub.user._id.toString();
      if (!userScores[uid]) {
        userScores[uid] = {
          user: sub.user,
          totalFinalScore: 0,
          totalCorrectness: 0,
          totalOptimization: 0,
          totalPlagiarism: 0,
          questionsAttempted: 0,
          totalTestsPassed: 0,
          totalTestCases: 0,
          submissions: [],
        };
      }
      userScores[uid].totalFinalScore += sub.finalScore;
      userScores[uid].totalCorrectness += sub.correctnessScore;
      userScores[uid].totalOptimization += sub.optimizationScore;
      userScores[uid].totalPlagiarism += sub.plagiarismScore;
      userScores[uid].questionsAttempted += 1;
      userScores[uid].totalTestsPassed += sub.testCasesPassed;
      userScores[uid].totalTestCases += sub.totalTestCases;
      userScores[uid].submissions.push({
        questionId: sub.questionId,
        language: sub.language,
        correctnessScore: sub.correctnessScore,
        optimizationScore: sub.optimizationScore,
        plagiarismScore: sub.plagiarismScore,
        finalScore: sub.finalScore,
        testCasesPassed: sub.testCasesPassed,
        totalTestCases: sub.totalTestCases,
        aiAnalysis: sub.aiAnalysis,
        submittedAt: sub.submittedAt,
      });
    });

    // Sort by total final score (descending)
    const leaderboard = Object.values(userScores)
      .sort((a, b) => b.totalFinalScore - a.totalFinalScore)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        avgFinalScore: Math.round(entry.totalFinalScore / entry.questionsAttempted),
        avgCorrectness: Math.round(entry.totalCorrectness / entry.questionsAttempted),
        avgOptimization: Math.round(entry.totalOptimization / entry.questionsAttempted),
        avgPlagiarism: Math.round(entry.totalPlagiarism / entry.questionsAttempted),
      }));

    res.json({
      assignmentTitle: assignment.title,
      totalQuestions: assignment.questions.length,
      totalParticipants: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/assignments/:id/my-submissions?questionId=xxx — Student's own submissions
const getMyAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const userId = req.user.id;
    const questionId = req.query.questionId;

    let mySubmissions = assignment.submissions.filter(
      s => s.user.toString() === userId.toString()
    );

    // Filter by questionId if provided
    if (questionId) {
      mySubmissions = mySubmissions.filter(
        s => s.questionId.toString() === questionId
      );
    }

    const result = mySubmissions
      .map(sub => ({
        _id: sub._id,
        questionId: sub.questionId,
        code: sub.code,
        language: sub.language,
        correctnessScore: sub.correctnessScore,
        optimizationScore: sub.optimizationScore,
        plagiarismScore: sub.plagiarismScore,
        finalScore: sub.finalScore,
        testCasesPassed: sub.testCasesPassed,
        totalTestCases: sub.totalTestCases,
        aiAnalysis: sub.aiAnalysis,
        submittedAt: sub.submittedAt,
      }))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({ submissions: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/assignments/:id/heartbeat
const assignmentHeartbeat = async (req, res) => {
  const aId = req.params.id;
  const userId = req.user.id;
  if (!activeSolvers.has(aId)) activeSolvers.set(aId, new Map());
  activeSolvers.get(aId).set(userId, Date.now());
  const count = cleanExpiredSolvers(aId);
  res.json({ activeSolvers: count });
};

// POST /api/assignments/:id/leave
const assignmentLeave = async (req, res) => {
  const aId = req.params.id;
  const userId = req.user.id;
  if (activeSolvers.has(aId)) activeSolvers.get(aId).delete(userId);
  res.json({ success: true });
};

module.exports = { createAssignment, getAssignments, getAssignmentById, submitSolution, getLeaderboard, getMyAssignmentSubmissions, assignmentHeartbeat, assignmentLeave };
