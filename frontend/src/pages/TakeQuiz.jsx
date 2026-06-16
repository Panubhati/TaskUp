import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const TakeQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quiz taking state
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  // Tab-switching anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningMsg, setTabWarningMsg] = useState('');
  const [banned, setBanned] = useState(false);
  const tabSwitchRef = useRef(0);
  const MAX_TAB_SWITCHES = 3;

  // Fullscreen helpers
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      exitFullscreen(); // exit fullscreen when leaving the page
    };
    // eslint-disable-next-line
  }, []);

  // Tab-switching detection — only active when quiz is started and not yet submitted
  useEffect(() => {
    if (!started || result || banned) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Student switched away from the tab
        const newCount = tabSwitchRef.current + 1;
        tabSwitchRef.current = newCount;
        setTabSwitchCount(newCount);

        // Report to backend
        try {
          const res = await axios.post(`${API}/quizzes/${id}/tab-violation`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data.banned) {
            setBanned(true);
            setTabWarningMsg(res.data.error);
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }
        } catch (err) {
          if (err.response?.status === 403 && err.response?.data?.banned) {
            setBanned(true);
            setTabWarningMsg(err.response.data.error);
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }
        }
      } else if (document.visibilityState === 'visible' && tabSwitchRef.current > 0 && !banned) {
        // Student returned — show warning
        const remaining = MAX_TAB_SWITCHES - tabSwitchRef.current;
        if (remaining > 0) {
          setTabWarningMsg(`⚠️ Tab switch detected! Warning ${tabSwitchRef.current}/${MAX_TAB_SWITCHES}. You will be BANNED after ${remaining} more switch${remaining !== 1 ? 'es' : ''}.`);
          setShowTabWarning(true);
          // Auto-dismiss after 5 seconds
          setTimeout(() => setShowTabWarning(false), 5000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line
  }, [started, result, banned, id, token]);

  const fetchQuiz = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuiz(res.data);
      setAnswers(new Array(res.data.questions.length).fill(-1));
      setTimeLeft(res.data.timeLimitMinutes * 60);

      // If banned from this quiz
      if (res.data.banned) {
        setBanned(true);
        setTabWarningMsg(res.data.error || 'You have been banned from this quiz.');
        setLoading(false);
        return;
      }

      // If already attempted, show result view directly
      if (res.data.hasAttempted && res.data.mySubmission) {
        setResult({
          score: res.data.mySubmission.score,
          totalPoints: res.data.mySubmission.totalPoints,
          percentage: res.data.mySubmission.percentage,
          timeTakenSeconds: res.data.mySubmission.timeTakenSeconds,
          // Rebuild results from answers + questions (correct answers visible after attempt)
          results: res.data.questions.map((q, i) => ({
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            selectedAnswer: res.data.mySubmission.answers[i],
            isCorrect: res.data.mySubmission.answers[i] === q.correctAnswer,
            points: q.points,
          })),
        });
        setStarted(true);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.banned) {
        setBanned(true);
        setTabWarningMsg(err.response.data.error);
      } else {
        setError(err.response?.data?.error || 'Failed to load quiz');
      }
    }
    setLoading(false);
  };

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await axios.post(`${API}/quizzes/${id}/submit`, {
        answers,
        timeTakenSeconds,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
      exitFullscreen(); // exit fullscreen after submission
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
      exitFullscreen();
    }
    setSubmitting(false);
  }, [answers, id, token, submitting]);

  const startQuiz = () => {
    enterFullscreen(); // enter fullscreen when quiz starts
    setStarted(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit when time runs out
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const selectAnswer = (qIdx, optIdx) => {
    if (result) return; // can't change after submission
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeTaken = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: 16, fontSize: '0.9rem' }}>Loading quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.errorBox}>{error || 'Quiz not found'}</div>
        </div>
      </div>
    );
  }

  // ─── BANNED VIEW ───
  if (banned) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.bannedCard}>
            <div style={S.bannedGradient}></div>
            <div style={S.bannedBody}>
              <div style={S.bannedIcon}>🚫</div>
              <h1 style={S.bannedTitle}>Banned from Quiz</h1>
              <p style={S.bannedDesc}>
                {tabWarningMsg || 'You have been banned from this quiz due to excessive tab-switching.'}
              </p>
              <div style={S.bannedInfoBox}>
                <span>🛡️</span>
                <div>
                  <strong>Anti-Cheat Policy:</strong> Switching tabs during a quiz is considered a violation.
                  After <strong>3 tab switches</strong>, you are permanently banned from the quiz.
                </div>
              </div>
              <button style={S.bannedBtn} onClick={() => { exitFullscreen(); navigate('/quizzes'); }}>
                ← Back to Quizzes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULT VIEW ───
  if (result) {
    const { score, totalPoints, percentage, timeTakenSeconds, results } = result;
    return (
      <div style={S.page}>
        <div style={S.container}>
          <button style={S.backBtn} onClick={() => { exitFullscreen(); navigate('/quizzes'); }}>← Back to Quizzes</button>

          {/* Score Card */}
          <div style={S.resultCard}>
            <div style={S.resultGradient}></div>
            <div style={S.resultBody}>
              <div style={S.resultHeader}>
                <div style={{
                  ...S.resultCircle,
                  borderColor: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#f43f5e',
                }}>
                  <span style={{
                    ...S.resultPercent,
                    color: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#f43f5e',
                  }}>{percentage}%</span>
                  <span style={S.resultLabel}>Score</span>
                </div>
                <div style={S.resultInfo}>
                  <h2 style={S.resultTitle}>{quiz.title}</h2>
                  <div style={S.resultStats}>
                    <span style={S.resultStat}>✅ {score}/{totalPoints} points</span>
                    <span style={S.resultStat}>⏱ {formatTimeTaken(timeTakenSeconds)}</span>
                    <span style={S.resultStat}>📝 {results?.filter(r => r.isCorrect).length}/{results?.length} correct</span>
                  </div>
                  <div style={{
                    ...S.resultBadge,
                    background: percentage >= 70 ? 'rgba(16,185,129,0.12)' : percentage >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)',
                    color: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#f43f5e',
                  }}>
                    {percentage >= 90 ? '🏆 Excellent!' : percentage >= 70 ? '👏 Great Job!' : percentage >= 40 ? '📖 Keep Practicing' : '💪 Try Harder'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          {results && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ color: '#f1f1f3', fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>📋 Detailed Results</h3>
              {results.map((r, i) => (
                <div key={i} style={{
                  ...S.reviewCard,
                  borderColor: r.isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                }}>
                  <div style={S.reviewHeader}>
                    <span style={{
                      ...S.reviewBadge,
                      background: r.isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                      color: r.isCorrect ? '#10b981' : '#f43f5e',
                    }}>
                      {r.isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                    <span style={S.reviewPoints}>{r.points} pt{r.points !== 1 ? 's' : ''}</span>
                  </div>
                  <p style={S.reviewQ}>Q{i + 1}. {r.questionText}</p>
                  <div style={S.reviewOptions}>
                    {r.options.map((opt, j) => (
                      <div key={j} style={{
                        ...S.reviewOpt,
                        background: j === r.correctAnswer ? 'rgba(16,185,129,0.08)' : j === r.selectedAnswer && !r.isCorrect ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: j === r.correctAnswer ? 'rgba(16,185,129,0.3)' : j === r.selectedAnswer && !r.isCorrect ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.04)',
                      }}>
                        <span style={{
                          ...S.reviewOptLabel,
                          color: j === r.correctAnswer ? '#10b981' : j === r.selectedAnswer && !r.isCorrect ? '#f43f5e' : '#5a5a66',
                        }}>
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span style={{
                          color: j === r.correctAnswer ? '#10b981' : j === r.selectedAnswer && !r.isCorrect ? '#f43f5e' : '#94949e',
                        }}>{opt}</span>
                        {j === r.correctAnswer && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#10b981' }}>✓ Correct</span>}
                        {j === r.selectedAnswer && j !== r.correctAnswer && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#f43f5e' }}>Your answer</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── START SCREEN ───
  if (!started) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <button style={S.backBtn} onClick={() => navigate('/quizzes')}>← Back to Quizzes</button>

          <div style={S.startCard}>
            <div style={S.startGradient}></div>
            <div style={S.startBody}>
              <div style={S.startIcon}>🧠</div>
              <h1 style={S.startTitle}>{quiz.title}</h1>
              {quiz.description && <p style={S.startDesc}>{quiz.description}</p>}

              <div style={S.startInfo}>
                <div style={S.infoItem}>
                  <span style={S.infoIcon}>📝</span>
                  <div>
                    <div style={S.infoValue}>{quiz.questions.length}</div>
                    <div style={S.infoLabel}>Questions</div>
                  </div>
                </div>
                <div style={S.infoItem}>
                  <span style={S.infoIcon}>⏱</span>
                  <div>
                    <div style={S.infoValue}>{quiz.timeLimitMinutes} min</div>
                    <div style={S.infoLabel}>Time Limit</div>
                  </div>
                </div>
                <div style={S.infoItem}>
                  <span style={S.infoIcon}>⭐</span>
                  <div>
                    <div style={S.infoValue}>{quiz.questions.reduce((s, q) => s + (q.points || 1), 0)}</div>
                    <div style={S.infoLabel}>Total Points</div>
                  </div>
                </div>
                <div style={S.infoItem}>
                  <span style={S.infoIcon}>🔒</span>
                  <div>
                    <div style={S.infoValue}>1</div>
                    <div style={S.infoLabel}>Attempt</div>
                  </div>
                </div>
              </div>

              {quiz.company?.username && (
                <p style={S.startCompany}>By <strong>{quiz.company.username}</strong></p>
              )}

              <div style={S.warningBox}>
                <span>⚠️</span>
                <div>
                  <strong>Important:</strong> You only have <strong>one attempt</strong>. The timer starts immediately and the quiz auto-submits when time runs out. Unanswered questions will be marked wrong.
                </div>
              </div>

              <div style={S.tabWarningBox}>
                <span>🛡️</span>
                <div>
                  <strong>Anti-Cheat:</strong> Switching tabs/windows is monitored. After <strong>3 tab switches</strong>, you will be <strong>permanently banned</strong> from this quiz.
                </div>
              </div>

              <button style={S.startBtn} onClick={startQuiz}>
                🚀 Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── QUIZ IN PROGRESS ───
  const question = quiz.questions[currentQ];
  const answeredCount = answers.filter(a => a !== -1).length;
  const isUrgent = timeLeft <= 60;
  const isCritical = timeLeft <= 30;

  return (
    <div style={S.page}>
      {/* Tab switch warning overlay */}
      {showTabWarning && (
        <div style={S.tabOverlay}>
          <div style={S.tabOverlayCard}>
            <div style={S.tabOverlayIcon}>⚠️</div>
            <h3 style={S.tabOverlayTitle}>Tab Switch Detected!</h3>
            <p style={S.tabOverlayMsg}>{tabWarningMsg}</p>
            <div style={S.tabOverlayBar}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  ...S.tabOverlayDot,
                  background: i <= tabSwitchCount ? '#f43f5e' : 'rgba(255,255,255,0.1)',
                  borderColor: i <= tabSwitchCount ? '#f43f5e' : 'rgba(255,255,255,0.15)',
                }}>
                  {i <= tabSwitchCount ? '✗' : '○'}
                </div>
              ))}
            </div>
            <button style={S.tabOverlayBtn} onClick={() => setShowTabWarning(false)}>
              I Understand — Continue Quiz
            </button>
          </div>
        </div>
      )}

      {/* Top bar with timer */}
      <div style={S.quizBar}>
        <div style={S.quizBarInner}>
          <div style={S.quizBarLeft}>
            <span style={S.quizBarTitle}>{quiz.title}</span>
            <span style={S.quizBarProgress}>{answeredCount}/{quiz.questions.length} answered</span>
            {tabSwitchCount > 0 && (
              <span style={{
                ...S.tabBadge,
                background: tabSwitchCount >= 2 ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: tabSwitchCount >= 2 ? '#f43f5e' : '#f59e0b',
                borderColor: tabSwitchCount >= 2 ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)',
              }}>
                🛡️ {tabSwitchCount}/{MAX_TAB_SWITCHES} warnings
              </span>
            )}
          </div>
          <div style={{
            ...S.timer,
            color: isCritical ? '#f43f5e' : isUrgent ? '#f59e0b' : '#10b981',
            background: isCritical ? 'rgba(244,63,94,0.1)' : isUrgent ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            borderColor: isCritical ? 'rgba(244,63,94,0.3)' : isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
            animation: isCritical ? 'pulse-glow 1s ease infinite' : 'none',
          }}>
            ⏱ {formatTimer(timeLeft)}
          </div>
        </div>
        {/* Progress bar */}
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${(answeredCount / quiz.questions.length) * 100}%` }}></div>
        </div>
      </div>

      <div style={S.quizContainer}>
        <div style={S.quizLayout}>
          {/* Question Panel */}
          <div style={S.questionPanel}>
            <div style={S.qHeader}>
              <span style={S.qBadge}>Question {currentQ + 1} of {quiz.questions.length}</span>
              <span style={S.qPointsBadge}>{question.points || 1} pt{(question.points || 1) !== 1 ? 's' : ''}</span>
            </div>
            <h2 style={S.qText}>{question.questionText}</h2>

            <div style={S.optionsList}>
              {question.options.map((opt, j) => (
                <button
                  key={j}
                  style={{
                    ...S.optBtn,
                    borderColor: answers[currentQ] === j ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)',
                    background: answers[currentQ] === j ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                  }}
                  onClick={() => selectAnswer(currentQ, j)}
                  onMouseEnter={e => {
                    if (answers[currentQ] !== j) {
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (answers[currentQ] !== j) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }
                  }}
                >
                  <span style={{
                    ...S.optLetter,
                    background: answers[currentQ] === j ? '#8b5cf6' : 'rgba(255,255,255,0.06)',
                    color: answers[currentQ] === j ? '#fff' : '#5a5a66',
                  }}>
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span style={{
                    color: answers[currentQ] === j ? '#f1f1f3' : '#c4c4cc',
                    fontWeight: answers[currentQ] === j ? 600 : 400,
                  }}>
                    {opt}
                  </span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={S.navRow}>
              <button
                style={{ ...S.navBtn, opacity: currentQ === 0 ? 0.4 : 1 }}
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(currentQ - 1)}
              >
                ← Previous
              </button>
              {currentQ < quiz.questions.length - 1 ? (
                <button style={S.navBtnPrimary} onClick={() => setCurrentQ(currentQ + 1)}>
                  Next →
                </button>
              ) : (
                <button
                  style={S.submitBtn}
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  {submitting ? '◌ Submitting...' : '✓ Submit Quiz'}
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div style={S.sidebar}>
            <h4 style={S.sidebarTitle}>Questions</h4>
            <div style={S.qGrid}>
              {quiz.questions.map((_, i) => (
                <button
                  key={i}
                  style={{
                    ...S.qDot,
                    background: currentQ === i ? '#8b5cf6' : answers[i] !== -1 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                    borderColor: currentQ === i ? '#8b5cf6' : answers[i] !== -1 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
                    color: currentQ === i ? '#fff' : answers[i] !== -1 ? '#10b981' : '#5a5a66',
                  }}
                  onClick={() => setCurrentQ(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={S.sidebarLegend}>
              <div style={S.legendItem}><div style={{ ...S.legendDot, background: '#8b5cf6' }}></div> Current</div>
              <div style={S.legendItem}><div style={{ ...S.legendDot, background: 'rgba(16,185,129,0.4)' }}></div> Answered</div>
              <div style={S.legendItem}><div style={{ ...S.legendDot, background: 'rgba(255,255,255,0.06)' }}></div> Unanswered</div>
            </div>

            <button
              style={{ ...S.submitBtn, width: '100%', marginTop: 16 }}
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? '◌ Submitting...' : '✓ Submit Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '40px 24px' },
  backBtn: { background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0, fontWeight: 500 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },

  // Start screen
  startCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden', animation: 'fadeIn 0.5s ease' },
  startGradient: { height: 4, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)' },
  startBody: { padding: '48px 40px', textAlign: 'center' },
  startIcon: { fontSize: '3rem', marginBottom: 20 },
  startTitle: { fontSize: '1.8rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 10 },
  startDesc: { fontSize: '0.95rem', color: '#94949e', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' },
  startInfo: { display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28, flexWrap: 'wrap' },
  infoItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' },
  infoIcon: { fontSize: '1.4rem' },
  infoValue: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f1f3' },
  infoLabel: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500 },
  startCompany: { fontSize: '0.85rem', color: '#5a5a66', marginBottom: 24 },
  warningBox: { display: 'flex', gap: 10, padding: '14px 18px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, color: '#f59e0b', fontSize: '0.82rem', textAlign: 'left', marginBottom: 16, maxWidth: 500, margin: '0 auto 16px' },
  tabWarningBox: { display: 'flex', gap: 10, padding: '14px 18px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12, color: '#f43f5e', fontSize: '0.82rem', textAlign: 'left', maxWidth: 500, margin: '0 auto 32px' },
  startBtn: { padding: '16px 48px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', letterSpacing: '0.3px' },

  // Tab-switching anti-cheat styles
  tabBadge: { padding: '4px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600, border: '1px solid', marginLeft: 4 },
  tabOverlay: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' },
  tabOverlayCard: { background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 24, padding: '48px 40px', textAlign: 'center', maxWidth: 460, width: '90%', boxShadow: '0 0 60px rgba(244,63,94,0.15)' },
  tabOverlayIcon: { fontSize: '3.5rem', marginBottom: 16 },
  tabOverlayTitle: { fontSize: '1.4rem', fontWeight: 700, color: '#f43f5e', marginBottom: 12 },
  tabOverlayMsg: { fontSize: '0.9rem', color: '#c4c4cc', lineHeight: 1.6, marginBottom: 24 },
  tabOverlayBar: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28 },
  tabOverlayDot: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, border: '2px solid', color: '#fff', transition: 'all 0.3s ease' },
  tabOverlayBtn: { padding: '14px 36px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', borderRadius: 12, color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' },

  // Banned screen styles
  bannedCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 20, overflow: 'hidden', animation: 'fadeIn 0.5s ease' },
  bannedGradient: { height: 4, background: 'linear-gradient(90deg, #f43f5e, #e11d48, #be123c)' },
  bannedBody: { padding: '48px 40px', textAlign: 'center' },
  bannedIcon: { fontSize: '4rem', marginBottom: 20 },
  bannedTitle: { fontSize: '1.8rem', fontWeight: 700, color: '#f43f5e', marginBottom: 14 },
  bannedDesc: { fontSize: '0.95rem', color: '#94949e', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.6 },
  bannedInfoBox: { display: 'flex', gap: 10, padding: '14px 18px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12, color: '#f43f5e', fontSize: '0.82rem', textAlign: 'left', maxWidth: 500, margin: '0 auto 32px' },
  bannedBtn: { padding: '14px 36px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94949e', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' },

  // Quiz in progress
  quizBar: { position: 'sticky', top: 64, zIndex: 100, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  quizBarInner: { maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  quizBarLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  quizBarTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#f1f1f3' },
  quizBarProgress: { fontSize: '0.78rem', color: '#5a5a66', fontWeight: 500 },
  timer: { padding: '8px 18px', borderRadius: 10, fontSize: '1rem', fontWeight: 700, fontFamily: "'Courier New', monospace", border: '1px solid', letterSpacing: '1px' },
  progressTrack: { height: 3, background: 'rgba(255,255,255,0.04)' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', transition: 'width 0.3s ease', borderRadius: 2 },

  quizContainer: { maxWidth: 1200, margin: '0 auto', padding: '28px 24px' },
  quizLayout: { display: 'flex', gap: 24, alignItems: 'flex-start' },

  // Question panel
  questionPanel: { flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '32px 28px' },
  qHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  qBadge: { padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 600 },
  qPointsBadge: { padding: '4px 10px', borderRadius: 50, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 },
  qText: { fontSize: '1.2rem', fontWeight: 600, color: '#f1f1f3', lineHeight: 1.5, marginBottom: 28 },

  optionsList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 },
  optBtn: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 12, border: '1px solid', cursor: 'pointer', transition: 'all 0.2s ease', background: 'none', fontFamily: 'inherit', fontSize: '0.92rem', textAlign: 'left', width: '100%' },
  optLetter: { width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0, transition: 'all 0.2s ease' },

  navRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  navBtn: { padding: '10px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#94949e', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  navBtnPrimary: { padding: '10px 24px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  submitBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' },

  // Sidebar
  sidebar: { width: 220, flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', position: 'sticky', top: 130 },
  sidebarTitle: { fontSize: '0.85rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 14 },
  qGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 },
  qDot: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s ease', fontFamily: 'inherit', background: 'none' },
  sidebarLegend: { marginBottom: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.7rem', color: '#5a5a66', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },

  // Result view
  resultCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden', marginBottom: 8 },
  resultGradient: { height: 4, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)' },
  resultBody: { padding: '36px 32px' },
  resultHeader: { display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' },
  resultCircle: { width: 120, height: 120, borderRadius: '50%', border: '4px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultPercent: { fontSize: '2rem', fontWeight: 800, lineHeight: 1 },
  resultLabel: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500, marginTop: 4 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: '1.4rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 12 },
  resultStats: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 },
  resultStat: { fontSize: '0.85rem', color: '#94949e' },
  resultBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 600 },

  // Review cards
  reviewCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 24px', marginBottom: 12 },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewBadge: { padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 },
  reviewPoints: { fontSize: '0.72rem', color: '#5a5a66' },
  reviewQ: { fontSize: '0.95rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 14, lineHeight: 1.5 },
  reviewOptions: { display: 'flex', flexDirection: 'column', gap: 8 },
  reviewOpt: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid', fontSize: '0.85rem' },
  reviewOptLabel: { width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, background: 'rgba(255,255,255,0.04)' },
};

export default TakeQuiz;
