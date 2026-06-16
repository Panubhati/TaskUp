import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

const API = "http://localhost:5000/api/code";
const ASSIGN_API = "http://localhost:5000/api/assignments";

/* ─────────────────────── Language configs ─────────────────────── */
const LANGUAGES = {
  javascript: {
    label: "JavaScript", monaco: "javascript", icon: "🟨",
    template: `// Write your solution here\n// Read input from stdin, print output with console.log()\n\nfunction solve(input) {\n  // Parse input and implement your solution\n  const lines = input.trim().split('\\n');\n  \n  // Your code here\n  \n  return result;\n}\n\n// Read stdin\nconst result = solve(stdin);\nconsole.log(result);`,
  },
  python: {
    label: "Python", monaco: "python", icon: "🐍",
    template: `import sys\n\ndef solve(data):\n    lines = data.strip().split('\\n')\n    # Parse input and implement your solution\n    \n    # Your code here\n    \n    return result\n\ndata = sys.stdin.read()\nprint(solve(data))`,
  },
  cpp: {
    label: "C++", monaco: "cpp", icon: "⚙️",
    template: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Read input and solve\n    \n    return 0;\n}`,
  },
  java: {
    label: "Java", monaco: "java", icon: "☕",
    template: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and solve\n        \n    }\n}`,
  },
};

/* ═══════════════════════ Main Component ════════════════════════════ */
export default function Solve() {
  const editorRef = useRef(null);
  const [taskId, setTaskId]       = useState(null);
  const [title, setTitle]         = useState("Untitled Task");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty]   = useState("");
  const [category, setCategory]       = useState("");
  const [tags, setTags]               = useState([]);
  const [constraints, setConstraints] = useState("");
  const [testCases, setTestCases]     = useState([]);
  const [examples, setExamples]       = useState([]);
  const [results, setResults]         = useState(null);
  const [running, setRunning]         = useState(false);
  const [loadError, setLoadError]     = useState("");
  const [language, setLanguage]       = useState("javascript");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [activeTab, setActiveTab]         = useState("description");
  const [customInput, setCustomInput]     = useState("");
  const [customOutput, setCustomOutput]   = useState(null);
  const [customRunning, setCustomRunning] = useState(false);

  // Assignment mode
  const [assignmentId, setAssignmentId] = useState(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [maxSubmissions, setMaxSubmissions] = useState(2);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const [timerStarted, setTimerStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Submissions history
  const [pastSubmissions, setPastSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState(null);

  // Stats
  const [totalSolved, setTotalSolved] = useState(0);
  const [activeSolversCount, setActiveSolversCount] = useState(0);

  // Time tracking for submission duration
  const [solveStartTime] = useState(() => {
    const key = `solve_start_${new URLSearchParams(window.location.search).get('taskId')}`;
    const saved = localStorage.getItem(key);
    if (saved) return parseInt(saved);
    const now = Date.now();
    localStorage.setItem(key, now.toString());
    return now;
  });

  /* ── Load task ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get("taskId");
    const aId = params.get("assignmentId");
    if (!qId) return;
    setTaskId(qId);
    if (aId) setAssignmentId(aId);

    // Load assignment metadata
    const metaRaw = localStorage.getItem("solve_assignment_meta");
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        if (meta.timeLimitMinutes) setTimeLimitMinutes(meta.timeLimitMinutes);
        if (meta.maxSubmissions) setMaxSubmissions(meta.maxSubmissions);
        localStorage.removeItem("solve_assignment_meta");
      } catch {}
    }

    const cached = localStorage.getItem(`solve_task_${qId}`);
    if (cached) {
      try {
        const t = JSON.parse(cached);
        setTitle(t.title || "Untitled Task");
        setDescription(t.description || "");
        setDifficulty(t.difficulty || "");
        setCategory(t.category || "");
        setTags(t.tags || []);
        setConstraints(t.constraints || "");
        setTestCases(t.testCases || []);
        setExamples(t.examples || []);
        if (t.testCases?.[0]?.input) setCustomInput(t.testCases[0].input);
        localStorage.removeItem(`solve_task_${qId}`);
        return;
      } catch (_) {}
    }
    fetchTask(qId);
  }, []);

  /* ── Heartbeat: track active solver + fetch stats ── */
  useEffect(() => {
    if (!taskId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const sendHeartbeat = async () => {
      try {
        const endpoint = assignmentId
          ? `http://localhost:5000/api/assignments/${assignmentId}/heartbeat`
          : `http://localhost:5000/api/tasks/${taskId}/heartbeat`;
        const res = await axios.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
        setActiveSolversCount(res.data.activeSolvers || 0);
      } catch {}
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000); // every 30s

    // Cleanup: mark user as leaving
    const handleLeave = () => {
      const leaveUrl = assignmentId
        ? `http://localhost:5000/api/assignments/${assignmentId}/leave`
        : `http://localhost:5000/api/tasks/${taskId}/leave`;
      navigator.sendBeacon(leaveUrl); // best-effort on page close
    };
    window.addEventListener('beforeunload', handleLeave);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [taskId, assignmentId]);

  /* ── Fetch my past submissions ── */
  const fetchMySubmissions = useCallback(async (tid, aid) => {
    const qId = tid || taskId;
    const aId = aid || assignmentId;
    if (!qId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingSubmissions(true);
    try {
      let url;
      if (aId) {
        // Assignment mode — fetch from assignment endpoint
        url = `http://localhost:5000/api/assignments/${aId}/my-submissions?questionId=${qId}`;
      } else {
        // Task mode
        url = `http://localhost:5000/api/tasks/${qId}/my-submissions`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPastSubmissions(res.data.submissions || []);
    } catch {}
    setLoadingSubmissions(false);
  }, [taskId, assignmentId]);

  // Fetch submissions on load
  useEffect(() => {
    if (taskId) fetchMySubmissions(taskId, assignmentId);
  }, [taskId, assignmentId, fetchMySubmissions]);

  /* ── Timer ── */
  useEffect(() => {
    if (timeLimitMinutes > 0 && !timerStarted) {
      const storageKey = `timer_${assignmentId}_${taskId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const remaining = Math.max(0, Math.floor((parseInt(saved) - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        const endTime = Date.now() + timeLimitMinutes * 60 * 1000;
        localStorage.setItem(storageKey, endTime.toString());
        setTimeLeft(timeLimitMinutes * 60);
      }
      setTimerStarted(true);
    }
  }, [timeLimitMinutes, timerStarted, assignmentId, taskId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = useCallback((seconds) => {
    if (seconds === null) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, []);

  /* ── Switch language → load template ── */
  useEffect(() => {
    if (!editorRef.current) return;
    const cur = editorRef.current.getValue();
    const isTemplate = Object.values(LANGUAGES).some(l => cur.trim() === l.template.trim());
    if (isTemplate || !cur.trim()) editorRef.current.setValue(LANGUAGES[language].template);
  }, [language]);

  const fetchTask = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/tasks/${id}`);
      const t = res.data;
      setTitle(t.title);
      setDescription(t.description || "");
      setTestCases(t.testCases || []);
      setExamples(t.examples || []);
      if (t.testCases?.[0]?.input) setCustomInput(t.testCases[0].input);
      if (t.stats) setTotalSolved(t.stats.totalSolved || 0);
    } catch {
      // Try as a question from question bank
      try {
        const res = await axios.get(`http://localhost:5000/api/questions/${id}`);
        const q = res.data;
        setTitle(q.title);
        setDescription(q.description || "");
        setDifficulty(q.difficulty || "");
        setCategory(q.category || "");
        setTags(q.tags || []);
        setConstraints(q.constraints || "");
        setTestCases(q.testCases || []);
        setExamples(q.examples || []);
        if (q.testCases?.[0]?.input) setCustomInput(q.testCases[0].input);
      } catch {
        setLoadError("Failed to load task — make sure the backend is running.");
      }
    }
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    setTimeout(() => {
      if (!editor.getValue().trim()) editor.setValue(LANGUAGES[language].template);
    }, 100);
  };

  /* ── Run all test cases ── */
  const runAllTests = async () => {
    if (!editorRef.current) return;
    const src = editorRef.current.getValue();
    if (!src.trim()) return alert("Editor is empty");
    if (!testCases.length) return alert("No test cases loaded.");
    if (timeLeft === 0 && timeLimitMinutes > 0) return alert("Time is up!");

    setRunning(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/evaluate`, {
        code: src,
        language: LANGUAGES[language].label,
        testCases,
      });
      setResults(res.data.results);
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error || err.message;
      const friendlyMsg = status === 429
        ? 'Rate limit hit — wait 60s and try again.'
        : serverMsg;
      setResults(testCases.map((tc, i) => ({
        index: i, input: tc.input, expected: tc.expectedOutput,
        actual: '', pass: false, error: friendlyMsg,
      })));
    }
    setRunning(false);
  };

  /* ── Run custom input ── */
  const runCustom = async () => {
    if (!editorRef.current) return;
    const src = editorRef.current.getValue();
    if (!src.trim()) return alert("Editor is empty");

    setCustomRunning(true);
    setCustomOutput(null);
    try {
      const res = await axios.post(`${API}/run`, {
        code: src,
        language: LANGUAGES[language].label,
        customInput,
      });
      setCustomOutput({ stdout: res.data.output, stderr: res.data.error });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setCustomOutput({ stdout: '', stderr: msg });
    }
    setCustomRunning(false);
  };

  /* ── Submit to assignment ── */
  const handleSubmit = async () => {
    if (!results) return alert("Run tests first before submitting");
    if (timeLeft === 0 && timeLimitMinutes > 0) return alert("Time is up! Cannot submit.");
    if (submissionCount >= maxSubmissions) return alert(`Maximum ${maxSubmissions} submissions used.`);

    if (assignmentId && taskId) {
      // Assignment submission
      setSubmitting(true);
      const token = localStorage.getItem("token");
      try {
        const timeTaken = Math.round((Date.now() - solveStartTime) / 1000);
        const res = await axios.post(`${ASSIGN_API}/${assignmentId}/submit`, {
          questionId: taskId,
          code: editorRef.current.getValue(),
          language: LANGUAGES[language].label,
          timeTakenSeconds: timeTaken,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmitResult(res.data.submission);
        setSubmissionCount(prev => prev + 1);
        // Refresh submission history
        fetchMySubmissions();
      } catch (err) {
        alert(err.response?.data?.error || "Submission failed");
      }
      setSubmitting(false);
    } else {
      // Task submission — get AI analysis and show results
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (token && taskId) {
        try {
          const timeTaken = Math.round((Date.now() - solveStartTime) / 1000);
          const res = await axios.post("http://localhost:5000/api/tasks/evaluate", {
            code: editorRef.current.getValue(),
            taskId,
            language: LANGUAGES[language].label,
            timeTakenSeconds: timeTaken,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Build a submitResult object matching the assignment format
          const sub = res.data.submission;
          setSubmitResult({
            correctnessScore: sub.score || 0,
            optimizationScore: sub.aiAnalysis?.optimizationNotes ? 70 : 50,
            testCasesPassed: sub.testCasesPassed || 0,
            totalTestCases: sub.totalTestCases || 0,
            finalScore: sub.score || 0,
            code: sub.code,
            language: sub.language,
            aiAnalysis: sub.aiAnalysis || {},
            testResults: sub.testResults || [],
          });
          setActiveTab("result");
          // Refresh submission history
          fetchMySubmissions();
        } catch (err) {
          alert(err.response?.data?.error || "Submission failed");
        }
      }
      setSubmitting(false);
    }
  };


  const passedCount = results ? results.filter(r => r.pass).length : 0;
  const cfg = LANGUAGES[language];
  const diffColor = difficulty === "Easy" ? "#10b981" : difficulty === "Medium" ? "#f59e0b" : difficulty === "Hard" ? "#f43f5e" : "#5a5a66";
  const isTimeUp = timeLeft === 0 && timeLimitMinutes > 0;
  const canSubmit = submissionCount < maxSubmissions && !isTimeUp;

  return (
    <div style={S.page} onClick={() => setLangDropdownOpen(false)}>

      {/* ── Top Bar ── */}
      <div style={S.topBar}>
        <div style={S.topLeft}>
          <span style={S.topIcon}>⚡</span>
          <h2 style={S.topTitle}>{title}</h2>
          {difficulty && (
            <span style={{ ...S.diffBadge, color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}30` }}>
              {difficulty}
            </span>
          )}
          {loadError && <span style={S.errorBadge}>⚠ {loadError}</span>}
        </div>
        <div style={S.topRight}>

          {/* Timer */}
          {timeLimitMinutes > 0 && (
            <div style={{ ...S.timerBadge, color: timeLeft <= 60 ? "#f43f5e" : timeLeft <= 300 ? "#f59e0b" : "#10b981", borderColor: timeLeft <= 60 ? "rgba(244,63,94,0.3)" : timeLeft <= 300 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)", background: timeLeft <= 60 ? "rgba(244,63,94,0.08)" : timeLeft <= 300 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)" }}>
              ⏱ {isTimeUp ? "TIME UP" : formatTime(timeLeft)}
            </div>
          )}

          {/* Submission counter */}
          {assignmentId && (
            <div style={S.subCountBadge}>
              📝 {submissionCount}/{maxSubmissions} used
            </div>
          )}



          {/* Language Selector */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button style={S.langBtn} onClick={() => setLangDropdownOpen(v => !v)}>
              <span>{cfg.icon}</span>
              <span style={{ color: "#f1f1f3", fontWeight: 600 }}>{cfg.label}</span>
              <span style={{ color: "#5a5a66", fontSize: "0.65rem" }}>▼</span>
            </button>
            {langDropdownOpen && (
              <div style={S.langDropdown}>
                {Object.entries(LANGUAGES).map(([key, l]) => (
                  <button key={key}
                    style={{ ...S.langOpt, ...(language === key ? S.langOptActive : {}) }}
                    onClick={() => { setLanguage(key); setResults(null); setCustomOutput(null); setLangDropdownOpen(false); }}>
                    <span>{l.icon}</span><span>{l.label}</span>
                    {language === key && <span style={{ marginLeft: "auto", color: "#8b5cf6" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {results && (
            <div style={{
              ...S.scoreBadge,
              background: passedCount === results.length ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              color: passedCount === results.length ? "#10b981" : "#f59e0b",
              border: `1px solid ${passedCount === results.length ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}>
              {passedCount}/{results.length} passed
            </div>
          )}

          <button onClick={runAllTests} disabled={running || customRunning || isTimeUp}
            style={{ ...S.runBtn, opacity: (running || customRunning || isTimeUp) ? 0.6 : 1 }}>
            {running ? <><span style={S.spinner}></span>Compiling...</> : <>▶ Run Tests</>}
          </button>
          <button onClick={handleSubmit} disabled={submitting || !canSubmit}
            style={{ ...S.submitBtn, opacity: (submitting || !canSubmit) ? 0.5 : 1 }}>
            {submitting ? "Submitting..." : "Submit →"}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={S.content}>
        {/* Editor */}
        <div style={S.editorWrap}>
          <div style={S.editorHeader}>
            <span style={S.dot1}/><span style={S.dot2}/><span style={S.dot3}/>
            <span style={S.editorLang}>{cfg.label}</span>
            <span style={S.editorHint}>
              Multi-language compiler
            </span>
          </div>
          <Editor
            height="calc(100vh - 120px)"
            language={cfg.monaco}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{ minimap: { enabled: false }, automaticLayout: true, fontSize: 14, padding: { top: 16 }, scrollBeyondLastLine: false, fontFamily: '"SF Mono","Fira Code",monospace', lineHeight: 22 }}
          />
        </div>

        {/* Right Panel */}
        <div style={S.panel}>
          {/* Tabs */}
          <div style={S.tabStrip}>
            <button style={{ ...S.tab, ...(activeTab === "description" ? S.tabActive : {}) }} onClick={() => setActiveTab("description")}>
              📄 Description
            </button>
            <button style={{ ...S.tab, ...(activeTab === "tests" ? S.tabActive : {}) }} onClick={() => setActiveTab("tests")}>
              🧪 Tests <span style={S.tabBadge}>{testCases.length}</span>
            </button>
            <button style={{ ...S.tab, ...(activeTab === "custom" ? S.tabActive : {}) }} onClick={() => setActiveTab("custom")}>
              ✏️ Custom
            </button>
            {submitResult && (
              <button style={{ ...S.tab, ...(activeTab === "result" ? S.tabActive : {}) }} onClick={() => setActiveTab("result")}>
                📊 Result
              </button>
            )}
            <button style={{ ...S.tab, ...(activeTab === "submissions" ? S.tabActive : {}) }} onClick={() => { setActiveTab("submissions"); fetchMySubmissions(); }}>
              📋 Submissions {pastSubmissions.length > 0 && <span style={S.tabBadge}>{pastSubmissions.length}</span>}
            </button>
          </div>

          {/* ── Description Tab ── */}
          {activeTab === "description" && (
            <div style={S.tabBody}>
              {/* Title & badges */}
              <h2 style={S.descTitle}>{title}</h2>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                {difficulty && (
                  <span style={{ ...S.descDiffBadge, color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}30` }}>
                    {difficulty}
                  </span>
                )}
                {category && <span style={S.descCatBadge}>{category}</span>}
              </div>

              {/* Stats bar */}
              <div style={S.statsBar}>
                <div style={S.statItem}>
                  <span style={S.statIcon}>✅</span>
                  <span style={S.statText}><strong>{totalSolved}</strong> Solved</span>
                </div>
                <div style={S.statDivider} />
                <div style={S.statItem}>
                  <span style={{ ...S.statIcon, color: activeSolversCount > 0 ? "#10b981" : "#5a5a66" }}>🔴</span>
                  <span style={S.statText}><strong>{activeSolversCount}</strong> Solving Now</span>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {tags.map(t => <span key={t} style={S.descTag}>{t}</span>)}
                </div>
              )}

              {/* Description text */}
              <div style={S.descSection}>
                <div style={S.descSectionTitle}>Problem Statement</div>
                <p style={S.descText}>{description || "No description available."}</p>
              </div>

              {/* Constraints */}
              {constraints && (
                <div style={S.descSection}>
                  <div style={S.descSectionTitle}>Constraints</div>
                  <pre style={S.descConstraints}>{constraints}</pre>
                </div>
              )}

              {/* Examples */}
              {examples.length > 0 && (
                <div style={S.descSection}>
                  <div style={S.descSectionTitle}>Examples</div>
                  {examples.map((ex, i) => (
                    <div key={i} style={S.descExample}>
                      <div style={S.descExLabel}>Example {i + 1}</div>
                      <div style={S.descExRow}>
                        <span style={S.descExKey}>Input:</span>
                        <pre style={S.descExCode}>{ex.input}</pre>
                      </div>
                      <div style={S.descExRow}>
                        <span style={S.descExKey}>Output:</span>
                        <pre style={S.descExCode}>{ex.expectedOutput}</pre>
                      </div>
                      {ex.explanation && (
                        <div style={S.descExRow}>
                          <span style={S.descExKey}>Explanation:</span>
                          <p style={S.descExExplanation}>{ex.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Assignment info */}
              {assignmentId && (
                <div style={S.infoBox}>
                  <strong style={{ color: "#a78bfa", fontSize: "0.75rem" }}>📋 Assignment Info</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#5a5a66", lineHeight: 1.6 }}>
                    {timeLimitMinutes > 0 && <><span style={{ color: "#f59e0b" }}>⏱ Time Limit: {timeLimitMinutes} minutes</span><br/></>}
                    <span style={{ color: "#06b6d4" }}>📝 Max Submissions: {maxSubmissions} per question</span><br/>
                    <span style={{ color: "#94949e" }}>Used: {submissionCount}/{maxSubmissions}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Test Cases Tab ── */}
          {activeTab === "tests" && (
            <div style={S.tabBody}>
              {testCases.length === 0 ? (
                <div style={S.emptyState}>
                  <p style={{ color: loadError ? "#f43f5e" : "#5a5a66", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    {loadError || "No test cases loaded."}
                  </p>
                </div>
              ) : (
                testCases.map((t, i) => {
                  const r = results?.find(x => x.index === i);
                  return (
                    <div key={i} style={{ ...S.card, borderLeft: `3px solid ${r ? (r.pass ? "#10b981" : "#f43f5e") : "rgba(255,255,255,0.06)"}` }}>
                      <div style={S.cardHead}>
                        <span style={S.cardLabel}>Case {i + 1}</span>
                        {r && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: r.pass ? "#10b981" : "#f43f5e" }}>
                          {r.pass ? "✓ PASS" : "✗ FAIL"}
                        </span>}
                      </div>
                      <div style={S.cardBody}>
                        <Row label="Input" value={t.input} />
                        <Row label="Expected" value={t.expectedOutput} />
                        {r && !r.pass && <>
                          <Row label="Got" value={r.actual || "(no output)"} error />
                          {r.error && <Row label="Error" value={r.error} warn />}
                        </>}
                      </div>
                    </div>
                  );
                })
              )}


            </div>
          )}

          {/* ── Custom Input Tab ── */}
          {activeTab === "custom" && (
            <div style={S.tabBody}>
              <div style={S.subHeader}>stdin for your code (raw text)</div>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                style={S.customTextarea}
                placeholder={"Type raw stdin input\nExample:\n3\n3 2 4\n6"}
                spellCheck={false}
              />
              <button
                onClick={runCustom}
                disabled={customRunning || running}
                style={{ ...S.runCustomBtn, opacity: (customRunning || running) ? 0.6 : 1 }}
              >
                {customRunning
                  ? <><span style={S.spinnerGreen}></span>Running...</>
                  : <>▶ Run Code</>}
              </button>

              {customOutput && (
                <div style={{ marginTop: "12px" }}>
                  <div style={S.subHeader}>Output</div>
                  {customOutput.stderr
                    ? <pre style={{ ...S.outputPre, color: "#f43f5e", background: "rgba(244,63,94,0.05)", borderColor: "rgba(244,63,94,0.15)" }}>{customOutput.stderr}</pre>
                    : <pre style={S.outputPre}>{customOutput.stdout || "(no output produced)"}</pre>
                  }
                </div>
              )}
            </div>
          )}

          {/* ── Result Tab ── */}
          {activeTab === "result" && submitResult && (
            <div style={S.tabBody}>
              <div style={S.resultHeader}>📊 Submission Analysis</div>

              {/* Score cards */}
              <div style={S.resultGrid}>
                <div style={S.resultCard}>
                  <div style={S.resultLabel}>Correctness</div>
                  <div style={{ ...S.resultValue, color: submitResult.correctnessScore >= 80 ? "#10b981" : "#f59e0b" }}>
                    {submitResult.correctnessScore}%
                  </div>
                  <div style={S.resultSub}>{submitResult.testCasesPassed}/{submitResult.totalTestCases} passed</div>
                </div>
                {submitResult.optimizationScore !== undefined && (
                  <div style={S.resultCard}>
                    <div style={S.resultLabel}>Optimization</div>
                    <div style={{ ...S.resultValue, color: "#06b6d4" }}>
                      {submitResult.optimizationScore}%
                    </div>
                  </div>
                )}
                {submitResult.plagiarismScore !== undefined && (
                  <div style={S.resultCard}>
                    <div style={S.resultLabel}>Plagiarism</div>
                    <div style={{ ...S.resultValue, color: submitResult.plagiarismScore <= 20 ? "#10b981" : "#f43f5e" }}>
                      {submitResult.plagiarismScore}%
                    </div>
                    <div style={S.resultSub}>{submitResult.plagiarismScore <= 20 ? "Original" : "Similarity detected"}</div>
                  </div>
                )}
                <div style={{ ...S.resultCard, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div style={{ ...S.resultLabel, color: "#a78bfa" }}>Score</div>
                  <div style={{ ...S.resultValue, color: "#a78bfa", fontSize: "1.8rem" }}>
                    {submitResult.finalScore}
                  </div>
                  <div style={S.resultSub}>out of 100</div>
                </div>
              </div>

              {/* Complexity Badges */}
              {(submitResult.aiAnalysis?.timeComplexity || submitResult.aiAnalysis?.spaceComplexity) && (
                <div style={S.complexityWrap}>
                  <div style={S.complexityTitle}>⏱ Complexity Analysis</div>
                  <div style={S.complexityRow}>
                    <div style={S.complexityBadge}>
                      <span style={S.complexityIcon}>⏱</span>
                      <div>
                        <div style={S.complexityLabel}>Time</div>
                        <div style={S.complexityValue}>{submitResult.aiAnalysis.timeComplexity || "N/A"}</div>
                      </div>
                    </div>
                    <div style={S.complexityBadge}>
                      <span style={S.complexityIcon}>💾</span>
                      <div>
                        <div style={S.complexityLabel}>Space</div>
                        <div style={S.complexityValue}>{submitResult.aiAnalysis.spaceComplexity || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Improvement Feedback */}
              {submitResult.aiAnalysis?.feedback && (
                <div style={S.feedbackWrap}>
                  <div style={S.feedbackTitle}>💡 Improvement Feedback</div>
                  <p style={S.feedbackText}>{submitResult.aiAnalysis.feedback}</p>
                </div>
              )}

              {/* Optimization Notes */}
              {submitResult.aiAnalysis?.optimizationNotes && (
                <div style={S.infoBox}>
                  <strong style={{ color: "#06b6d4", fontSize: "0.75rem" }}>⚡ Optimization Notes</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94949e", lineHeight: 1.5 }}>
                    {submitResult.aiAnalysis.optimizationNotes}
                  </p>
                </div>
              )}

              {/* Plagiarism Notes (assignment only) */}
              {submitResult.aiAnalysis?.plagiarismNotes && (
                <div style={{ ...S.infoBox, marginTop: 8 }}>
                  <strong style={{ color: "#f59e0b", fontSize: "0.75rem" }}>🔍 Plagiarism Analysis</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94949e", lineHeight: 1.5 }}>
                    {submitResult.aiAnalysis.plagiarismNotes}
                  </p>
                </div>
              )}

              {/* Test Results Summary */}
              {submitResult.testResults && submitResult.testResults.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={S.feedbackTitle}>🧪 Test Results</div>
                  {submitResult.testResults.map((tr, i) => (
                    <div key={i} style={{ ...S.testResultRow, borderLeft: `3px solid ${tr.pass ? "#10b981" : "#f43f5e"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#5a5a66" }}>Case {i + 1}</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: tr.pass ? "#10b981" : "#f43f5e" }}>
                          {tr.pass ? "✓ PASS" : "✗ FAIL"}
                        </span>
                      </div>
                      {!tr.pass && tr.error && (
                        <div style={{ fontSize: "0.72rem", color: "#f43f5e", marginTop: 4, fontFamily: '"SF Mono","Fira Code",monospace' }}>
                          {tr.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submitted Code Viewer */}
              {submitResult.code && (
                <div style={{ marginTop: 12 }}>
                  <div style={S.feedbackTitle}>📝 Submitted Solution</div>
                  <div style={S.submittedCodeWrap}>
                    <div style={S.submittedCodeHeader}>
                      <span style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 600, textTransform: "uppercase" }}>
                        {submitResult.language || language}
                      </span>
                    </div>
                    <pre style={S.submittedCodeBlock}>{submitResult.code}</pre>
                  </div>
                </div>
              )}

              {assignmentId && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "#5a5a66" }}>
                    Submissions remaining: {maxSubmissions - submissionCount}/{maxSubmissions}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Submissions History Tab (LeetCode-style) ── */}
          {activeTab === "submissions" && (
            <div style={S.tabBody}>
              <div style={S.resultHeader}>📋 My Submissions</div>

              {loadingSubmissions ? (
                <div style={S.emptyState}>
                  <div style={{ ...S.spinnerSmall, margin: "0 auto 12px" }}></div>
                  <p style={{ color: "#5a5a66", fontSize: "0.85rem" }}>Loading submissions...</p>
                </div>
              ) : pastSubmissions.length === 0 ? (
                <div style={S.emptyState}>
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>📭</span>
                  <h4 style={{ color: "#f1f1f3", marginBottom: 6, fontWeight: 600, fontSize: "0.95rem" }}>No submissions yet</h4>
                  <p style={{ color: "#5a5a66", fontSize: "0.82rem" }}>Submit your solution to see it here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pastSubmissions.map((sub, idx) => {
                    const isExpanded = expandedSubId === sub._id;
                    const displayScore = sub.finalScore ?? sub.score ?? 0;
                    const correctness = sub.correctnessScore ?? sub.score ?? 0;
                    const scoreColor = displayScore >= 80 ? "#10b981" : displayScore >= 50 ? "#f59e0b" : "#f43f5e";
                    const statusIcon = displayScore >= 80 ? "✓" : displayScore >= 50 ? "◐" : "✗";
                    const statusText = displayScore >= 80 ? "Accepted" : displayScore >= 50 ? "Partial" : "Wrong Answer";
                    const timeAgo = getTimeAgo(sub.submittedAt);

                    return (
                      <div key={sub._id} style={S.subHistoryCard}>
                        {/* Submission header row — clickable */}
                        <div
                          style={S.subHistoryHeader}
                          onClick={() => setExpandedSubId(isExpanded ? null : sub._id)}
                        >
                          <div style={S.subHistoryLeft}>
                            <span style={{ ...S.subHistoryStatus, color: scoreColor }}>
                              {statusIcon} {statusText}
                            </span>
                            <span style={S.subHistoryMeta}>#{pastSubmissions.length - idx}</span>
                          </div>
                          <div style={S.subHistoryRight}>
                            <span style={S.subHistoryLang}>{sub.language || "javascript"}</span>
                            <span style={{ ...S.subHistoryScore, color: scoreColor }}>{displayScore}%</span>
                            <span style={S.subHistoryTime}>{timeAgo}</span>
                            <span style={{ color: "#5a5a66", fontSize: "0.65rem" }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={S.subHistoryBody}>
                            {/* Score + complexity row */}
                            <div style={S.subHistoryStatsRow}>
                              <div style={S.subHistoryStat}>
                                <div style={S.subHistoryStatLabel}>Score</div>
                                <div style={{ ...S.subHistoryStatValue, color: scoreColor }}>{displayScore}%</div>
                              </div>
                              <div style={S.subHistoryStat}>
                                <div style={S.subHistoryStatLabel}>Tests Passed</div>
                                <div style={S.subHistoryStatValue}>{sub.testCasesPassed || 0}/{sub.totalTestCases || 0}</div>
                              </div>
                              {sub.correctnessScore !== undefined && sub.correctnessScore !== sub.finalScore && (
                                <div style={S.subHistoryStat}>
                                  <div style={S.subHistoryStatLabel}>Correctness</div>
                                  <div style={{ ...S.subHistoryStatValue, color: sub.correctnessScore >= 80 ? "#10b981" : "#f59e0b" }}>{sub.correctnessScore}%</div>
                                </div>
                              )}
                              {sub.optimizationScore !== undefined && (
                                <div style={S.subHistoryStat}>
                                  <div style={S.subHistoryStatLabel}>Optimization</div>
                                  <div style={{ ...S.subHistoryStatValue, color: "#06b6d4" }}>{sub.optimizationScore}%</div>
                                </div>
                              )}
                              {sub.plagiarismScore !== undefined && (
                                <div style={S.subHistoryStat}>
                                  <div style={S.subHistoryStatLabel}>Plagiarism</div>
                                  <div style={{ ...S.subHistoryStatValue, color: sub.plagiarismScore <= 20 ? "#10b981" : "#f43f5e" }}>{sub.plagiarismScore}%</div>
                                </div>
                              )}
                              {sub.aiAnalysis?.timeComplexity && sub.aiAnalysis.timeComplexity !== "N/A" && (
                                <div style={S.subHistoryStat}>
                                  <div style={S.subHistoryStatLabel}>⏱ Time</div>
                                  <div style={{ ...S.subHistoryStatValue, color: "#06b6d4" }}>{sub.aiAnalysis.timeComplexity}</div>
                                </div>
                              )}
                              {sub.aiAnalysis?.spaceComplexity && sub.aiAnalysis.spaceComplexity !== "N/A" && (
                                <div style={S.subHistoryStat}>
                                  <div style={S.subHistoryStatLabel}>💾 Space</div>
                                  <div style={{ ...S.subHistoryStatValue, color: "#a78bfa" }}>{sub.aiAnalysis.spaceComplexity}</div>
                                </div>
                              )}
                            </div>

                            {/* AI Feedback */}
                            {sub.aiAnalysis?.feedback && (
                              <div style={S.subHistoryFeedback}>
                                <strong style={{ color: "#a78bfa", fontSize: "0.72rem" }}>💡 Improvement Feedback</strong>
                                <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#94949e", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                  {sub.aiAnalysis.feedback}
                                </p>
                              </div>
                            )}

                            {/* Optimization Notes */}
                            {sub.aiAnalysis?.optimizationNotes && (
                              <div style={{ ...S.subHistoryFeedback, borderColor: "rgba(6,182,212,0.12)" }}>
                                <strong style={{ color: "#06b6d4", fontSize: "0.72rem" }}>⚡ Optimization</strong>
                                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94949e", lineHeight: 1.5 }}>
                                  {sub.aiAnalysis.optimizationNotes}
                                </p>
                              </div>
                            )}

                            {/* Code viewer */}
                            <div style={S.subHistoryCodeWrap}>
                              <div style={S.subHistoryCodeHeader}>
                                <span style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 600, textTransform: "uppercase" }}>
                                  {sub.language || "javascript"}
                                </span>
                                <button
                                  style={S.subHistoryCopyBtn}
                                  onClick={() => {
                                    navigator.clipboard.writeText(sub.code || "");
                                  }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <pre style={S.subHistoryCodeBlock}>{sub.code || "(No code saved)"}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Time up overlay */}
      {isTimeUp && (
        <div style={S.timeUpOverlay}>
          <div style={S.timeUpBox}>
            <span style={{ fontSize: "3rem" }}>⏰</span>
            <h2 style={{ color: "#f43f5e", fontSize: "1.5rem", margin: "12px 0 8px" }}>Time's Up!</h2>
            <p style={{ color: "#5a5a66", fontSize: "0.9rem", marginBottom: 16 }}>Your time limit of {timeLimitMinutes} minutes has expired.</p>
            <button onClick={() => window.history.back()} style={S.timeUpBtn}>← Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Time ago helper ─── */
function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ─── Row helper ─── */
function Row({ label, value, error, warn, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
      <span style={{ fontSize: "0.6rem", fontWeight: 700, color: error ? "#f43f5e" : warn ? "#f59e0b" : "#5a5a66", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      {text
        ? <p style={{ fontSize: "0.78rem", color: "#6b6b78", margin: 0, lineHeight: 1.4 }}>{value}</p>
        : <pre style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.78rem", margin: 0, padding: "5px 8px", borderRadius: "6px", whiteSpace: "pre-wrap", wordBreak: "break-word", color: error ? "#f43f5e" : warn ? "#f59e0b" : "#06b6d4", background: error ? "rgba(244,63,94,0.05)" : warn ? "rgba(245,158,11,0.05)" : "rgba(6,182,212,0.05)", border: `1px solid ${error ? "rgba(244,63,94,0.15)" : warn ? "rgba(245,158,11,0.15)" : "rgba(6,182,212,0.08)"}` }}>{value}</pre>}
    </div>
  );
}

/* ─── Styles ─── */
const S = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", overflow: "hidden" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, height: "52px", gap: "10px" },
  topLeft: { display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 },
  topIcon: { fontSize: "1.1rem", filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))", flexShrink: 0 },
  topTitle: { fontSize: "0.92rem", fontWeight: 600, color: "#f1f1f3", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" },
  diffBadge: { padding: "2px 8px", borderRadius: 50, fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 },
  errorBadge: { fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "6px", padding: "3px 8px", flexShrink: 0 },
  topRight: { display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 },
  timerBadge: { padding: "5px 12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 800, fontFamily: '"SF Mono","Fira Code",monospace', border: "1px solid", letterSpacing: "0.5px" },
  subCountBadge: { padding: "4px 10px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600, background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" },

  langBtn: { display: "flex", alignItems: "center", gap: "5px", padding: "6px 11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#94949e", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" },
  langDropdown: { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", zIndex: 100, minWidth: "160px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" },
  langOpt: { display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "#94949e", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" },
  langOptActive: { background: "rgba(139,92,246,0.1)", color: "#f1f1f3" },
  scoreBadge: { padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700 },
  runBtn: { display: "flex", alignItems: "center", gap: "5px", padding: "7px 13px", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  submitBtn: { padding: "7px 13px", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  spinner: { width: "11px", height: "11px", border: "2px solid rgba(16,185,129,0.3)", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" },
  spinnerGreen: { width: "11px", height: "11px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" },
  content: { display: "flex", flex: 1, overflow: "hidden" },
  editorWrap: { flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" },
  editorHeader: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 },
  dot1: { width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", opacity: 0.7 },
  dot2: { width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", opacity: 0.7 },
  dot3: { width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", opacity: 0.7 },
  editorLang: { marginLeft: "8px", fontSize: "0.7rem", color: "#5a5a66", fontWeight: 500 },
  editorHint: { marginLeft: "auto", fontSize: "0.68rem", color: "#3a3a44" },
  panel: { width: "420px", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" },
  tabStrip: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 },
  tab: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "10px 6px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#5a5a66", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  tabActive: { color: "#f1f1f3", borderBottomColor: "#8b5cf6", background: "rgba(139,92,246,0.04)" },
  tabBadge: { padding: "1px 6px", borderRadius: "50px", background: "rgba(139,92,246,0.12)", color: "#a78bfa", fontSize: "0.65rem", fontWeight: 700 },
  tabBody: { flex: 1, overflowY: "auto", padding: "14px" },
  subHeader: { fontSize: "0.7rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },

  // Description tab
  descTitle: { fontSize: "1.3rem", fontWeight: 700, color: "#f1f1f3", marginBottom: "8px", lineHeight: 1.3 },
  descDiffBadge: { padding: "3px 10px", borderRadius: 50, fontSize: "0.72rem", fontWeight: 700 },
  descCatBadge: { padding: "3px 10px", borderRadius: 50, fontSize: "0.72rem", fontWeight: 600, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" },
  statsBar: { display: "flex", alignItems: "center", gap: "0", marginBottom: "14px", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" },
  statItem: { display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "center" },
  statIcon: { fontSize: "0.75rem" },
  statText: { fontSize: "0.78rem", color: "#94949e" },
  statDivider: { width: "1px", height: "20px", background: "rgba(255,255,255,0.08)" },
  descTag: { padding: "2px 8px", borderRadius: 50, fontSize: "0.65rem", fontWeight: 500, background: "rgba(6,182,212,0.06)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.12)" },
  descSection: { marginBottom: "18px" },
  descSectionTitle: { fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  descText: { fontSize: "0.88rem", color: "#c4c4cc", lineHeight: 1.7, margin: 0 },
  descConstraints: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.78rem", color: "#f59e0b", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.1)", padding: "10px 12px", borderRadius: "8px", margin: 0, whiteSpace: "pre-wrap" },
  descExample: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px", marginBottom: "10px" },
  descExLabel: { fontSize: "0.7rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", marginBottom: "8px" },
  descExRow: { marginBottom: "6px" },
  descExKey: { fontSize: "0.68rem", fontWeight: 600, color: "#5a5a66", display: "block", marginBottom: "3px" },
  descExCode: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.8rem", color: "#06b6d4", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.08)", padding: "6px 10px", borderRadius: "6px", margin: 0, whiteSpace: "pre-wrap" },
  descExExplanation: { fontSize: "0.8rem", color: "#6b6b78", margin: 0, lineHeight: 1.5, fontStyle: "italic" },

  // Cards
  card: { background: "rgba(255,255,255,0.02)", borderRadius: "8px", marginBottom: "8px", overflow: "hidden", borderLeft: "3px solid rgba(255,255,255,0.06)" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  cardLabel: { fontSize: "0.68rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", letterSpacing: "0.3px" },
  cardBody: { padding: "8px 10px" },
  emptyState: { textAlign: "center", padding: "24px 16px" },
  infoBox: { marginTop: "10px", padding: "10px 12px", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)", borderRadius: "8px" },
  customTextarea: { width: "100%", minHeight: "130px", boxSizing: "border-box", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#06b6d4", fontSize: "0.82rem", fontFamily: '"SF Mono","Fira Code",monospace', resize: "vertical", outline: "none", lineHeight: 1.6, marginBottom: "10px" },
  runCustomBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  outputPre: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.8rem", color: "#06b6d4", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.1)", padding: "8px 10px", borderRadius: "8px", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: "40px" },

  // Result tab
  resultHeader: { fontSize: "1.1rem", fontWeight: 700, color: "#f1f1f3", marginBottom: "16px", textAlign: "center" },
  resultGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" },
  resultCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px", textAlign: "center" },
  resultLabel: { fontSize: "0.68rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" },
  resultValue: { fontSize: "1.4rem", fontWeight: 800 },
  resultSub: { fontSize: "0.68rem", color: "#5a5a66", marginTop: "4px" },

  // Complexity badges
  complexityWrap: { marginBottom: "14px", padding: "14px", background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)", borderRadius: "12px" },
  complexityTitle: { fontSize: "0.75rem", fontWeight: 700, color: "#06b6d4", marginBottom: "10px" },
  complexityRow: { display: "flex", gap: "10px" },
  complexityBadge: { flex: 1, display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" },
  complexityIcon: { fontSize: "1.2rem" },
  complexityLabel: { fontSize: "0.62rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" },
  complexityValue: { fontSize: "1rem", fontWeight: 800, color: "#06b6d4", fontFamily: '"SF Mono","Fira Code",monospace' },

  // Feedback section
  feedbackWrap: { marginBottom: "12px", padding: "14px", background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(16,185,129,0.04))", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "12px" },
  feedbackTitle: { fontSize: "0.75rem", fontWeight: 700, color: "#a78bfa", marginBottom: "8px" },
  feedbackText: { fontSize: "0.82rem", color: "#c4c4cc", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" },

  // Test result rows
  testResultRow: { padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", marginBottom: "6px" },

  // Submitted code viewer
  submittedCodeWrap: { borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" },
  submittedCodeHeader: { padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  submittedCodeBlock: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.78rem", color: "#c4c4cc", background: "#0d0d14", padding: "12px 14px", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "300px", overflowY: "auto", lineHeight: 1.6 },

  // Submissions history tab
  spinnerSmall: { width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  subHistoryCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s ease" },
  subHistoryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer", transition: "background 0.15s ease" },
  subHistoryLeft: { display: "flex", alignItems: "center", gap: "10px" },
  subHistoryRight: { display: "flex", alignItems: "center", gap: "10px" },
  subHistoryStatus: { fontSize: "0.82rem", fontWeight: 700 },
  subHistoryMeta: { fontSize: "0.68rem", color: "#5a5a66", fontWeight: 500 },
  subHistoryLang: { padding: "2px 8px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600, background: "rgba(139,92,246,0.08)", color: "#a78bfa", textTransform: "capitalize" },
  subHistoryScore: { fontSize: "0.88rem", fontWeight: 800, fontFamily: '"SF Mono","Fira Code",monospace' },
  subHistoryTime: { fontSize: "0.68rem", color: "#5a5a66" },
  subHistoryBody: { borderTop: "1px solid rgba(255,255,255,0.06)" },
  subHistoryStatsRow: { display: "flex", gap: "8px", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" },
  subHistoryStat: { flex: 1, minWidth: "70px", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", textAlign: "center" },
  subHistoryStatLabel: { fontSize: "0.6rem", fontWeight: 700, color: "#5a5a66", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" },
  subHistoryStatValue: { fontSize: "0.88rem", fontWeight: 800, color: "#f1f1f3", fontFamily: '"SF Mono","Fira Code",monospace' },
  subHistoryFeedback: { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(139,92,246,0.03)" },
  subHistoryCodeWrap: { borderRadius: 0, overflow: "hidden" },
  subHistoryCodeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  subHistoryCopyBtn: { padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#94949e", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" },
  subHistoryCodeBlock: { fontFamily: '"SF Mono","Fira Code",monospace', fontSize: "0.78rem", color: "#c4c4cc", background: "#0d0d14", padding: "14px", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "350px", overflowY: "auto", lineHeight: 1.6 },

  // Time up overlay
  timeUpOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 },
  timeUpBox: { background: "#16161e", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "16px", padding: "40px", textAlign: "center", maxWidth: "400px" },
  timeUpBtn: { padding: "10px 24px", background: "rgba(244,63,94,0.1)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
