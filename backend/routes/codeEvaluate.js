const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

/* ── Parse JSON out of LLM response (strips markdown fences) ── */
function parseJson(text, type = 'array') {
  const cleaned = text.trim()
    .replace(/^```(?:json)?\n?/gi, '')
    .replace(/\n?```$/gi, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = cleaned.match(pattern);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse LLM response as JSON. Got: ' + cleaned.substring(0, 300));
  }
}

/* ── Programmatic syntax pre-check ── */
function syntaxPreCheck(code, language) {
  const errors = [];

  // 1. Check balanced brackets/braces/parentheses
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

    // Handle newlines (reset line comments)
    if (ch === '\n') { inLineComment = false; continue; }
    if (inLineComment) continue;

    // Handle block comments
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }

    // Detect comment starts
    if (!inString && ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (!inString && ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    // Python line comments
    if (!inString && ch === '#' && ['python', 'py'].includes(language.toLowerCase())) { inLineComment = true; continue; }

    // Handle strings
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true; stringChar = ch; continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped char
      if (ch === stringChar) { inString = false; }
      continue;
    }

    // Check brackets
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

  if (inString) { errors.push('Unterminated string literal'); }
  if (inBlockComment) { errors.push('Unterminated block comment'); }
  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push(`Unclosed '${unclosed.char}'`);
  }

  return errors;
}

/* ── Shared Groq call ── */
async function groqCall(apiKey, prompt) {
  const groq = new Groq({ apiKey });
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a strict code compiler and interpreter. You must evaluate code EXACTLY as written — never auto-correct, never assume missing code, never be lenient. If code has ANY syntax error (missing semicolons, unclosed brackets, incomplete conditions, etc.), it MUST fail. Always respond with raw JSON only — no markdown, no explanation, no code fences.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || '';
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/code/evaluate
   Body: { code, language, testCases: [{input, expectedOutput}] }
   Returns: { results: [{index, input, expected, actual, pass, error}] }
───────────────────────────────────────────────────────────────── */
router.post('/evaluate', async (req, res) => {
  const { code, language, testCases } = req.body;

  if (!code || !language || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'code, language, and testCases are required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in .env' });
  }

  // Programmatic syntax pre-check — fail ALL test cases if brackets are broken
  const syntaxErrors = syntaxPreCheck(code, language);
  if (syntaxErrors.length > 0) {
    const errorMsg = 'Syntax Error: ' + syntaxErrors.join('; ');
    const results = testCases.map((tc, i) => ({
      index: i,
      input: tc.input || '',
      expected: tc.expectedOutput || '',
      actual: '',
      pass: false,
      error: errorMsg,
    }));
    return res.json({ results });
  }

  try {
    const testCasesText = testCases.map((tc, i) =>
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
${testCasesText}

IMPORTANT: You MUST return EXACTLY ${testCases.length} results — one for each test case, in order.
Respond with ONLY this raw JSON array:
[{"index":0,"actual":"<stdout or empty if error>","pass":<bool>,"error":"<error description or null>"}]`;

    const text = await groqCall(apiKey, prompt);
    let rawResults = parseJson(text, 'array');

    // Pad results to match test case count — LLM may return fewer
    const results = testCases.map((tc, i) => {
      const r = rawResults.find(x => x.index === i) || rawResults[i] || {};
      return {
        index: i,
        input: tc.input || '',
        expected: tc.expectedOutput || '',
        actual: (r.actual ?? '').trim(),
        pass: r.pass ?? false,
        error: r.error ?? (r.pass === undefined ? 'Evaluation incomplete — test case was not evaluated' : null),
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Groq evaluate error:', error.message);
    res.status(500).json({ error: 'AI evaluation failed: ' + error.message });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/code/run
   Body: { code, language, customInput }
   Returns: { output, error }
───────────────────────────────────────────────────────────────── */
router.post('/run', async (req, res) => {
  const { code, language, customInput } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in .env' });
  }

  // Programmatic syntax pre-check
  const syntaxErrors = syntaxPreCheck(code, language);
  if (syntaxErrors.length > 0) {
    return res.json({ output: '', error: 'Syntax Error: ' + syntaxErrors.join('; ') });
  }

  try {
    const prompt = `You are a strict ${language} compiler/interpreter. Execute this code EXACTLY as written.

CRITICAL: If the code has ANY syntax error (missing semicolons, unclosed brackets, incomplete conditions), return an error. DO NOT auto-correct or assume missing code.

Code:
\`\`\`${language}
${code}
\`\`\`

stdin:
${customInput || '(empty)'}

Respond with ONLY this raw JSON (no markdown):
{"output":"<exact stdout trimmed>","error":<null or "error description if syntax error or crash">}`;

    const text = await groqCall(apiKey, prompt);
    const parsed = parseJson(text, 'object');

    res.json({ output: (parsed.output ?? '').trim(), error: parsed.error ?? null });
  } catch (error) {
    console.error('Groq run error:', error.message);
    res.status(500).json({ error: 'AI run failed: ' + error.message });
  }
});

module.exports = router;
