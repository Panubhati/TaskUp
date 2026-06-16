import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [expandedSub, setExpandedSub] = useState(null);
  const [tab, setTab] = useState('details');

  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTask();
    if (role === 'company' && token) {
      fetchSubmissions();
      fetchLeaderboard();
    }
    // eslint-disable-next-line
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTask(res.data);
    } catch (err) {
      setError('Error fetching task details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(res.data.submissions || []);
    } catch (err) {}
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${id}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(res.data);
    } catch (err) {}
  };

  const params = new URLSearchParams(window.location.search);
  const submittedResult = params.get('result');

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  const fmtTime = (sec) => {
    if (!sec || sec <= 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div style={S.centerWrap}>
        <div style={S.spinner}></div>
        <p style={S.loadingText}>Loading challenge...</p>
      </div>
    );
  }

  if (error) return <div style={S.page}><div style={S.container}><div style={S.errorBox}>⚠️ {error}</div></div></div>;
  if (!task) return null;

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Header ── */}
        <div style={S.header}>
          <span style={S.tag}>CHALLENGE</span>
          <h1 style={S.title}>{task.title}</h1>
          <p style={S.desc}>{task.description}</p>
          {task.stats && (
            <div style={S.miniStats}>
              <span style={S.miniItem}>✅ <strong>{task.stats.totalSolved}</strong> Solved</span>
              <span style={S.miniDivider}></span>
              <span style={S.miniItem}>
                <span style={{ color: task.stats.activeSolvers > 0 ? '#10b981' : '#5a5a66' }}>●</span>{' '}
                <strong>{task.stats.activeSolvers}</strong> Solving Now
              </span>
            </div>
          )}
        </div>

        {/* Result banner */}
        {submittedResult && (
          <div style={S.resultBanner}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <div>
              <div style={S.resultLabel}>Submission Result</div>
              <div style={S.resultVal}>{submittedResult} test cases passed</div>
            </div>
          </div>
        )}

        {/* ── Company Tabs ── */}
        {role === 'company' && (
          <div style={S.tabBar}>
            {[
              { key: 'details', label: 'Details' },
              { key: 'leaderboard', label: `Leaderboard (${leaderboard?.totalParticipants || 0})` },
              { key: 'submissions', label: `Submissions (${submissions.length})` },
            ].map(t => (
              <button key={t.key}
                style={{ ...S.tabBtn, ...(tab === t.key ? S.tabActive : {}) }}
                onClick={() => setTab(t.key)}
              >{t.label}</button>
            ))}
          </div>
        )}

        {/* ═══ Details ═══ */}
        {(tab === 'details' || role !== 'company') && (
          <>
            {/* Examples */}
            {task.examples?.length > 0 && (
              <div style={S.section}>
                <h3 style={S.secTitle}>Examples</h3>
                {task.examples.map((ex, i) => (
                  <div key={i} style={S.exCard}>
                    <div style={S.exHeader}>Example {i + 1}</div>
                    <div style={S.exBody}>
                      <div style={S.exRow}>
                        <span style={S.exLabel}>Input</span>
                        <pre style={S.exCode}>{ex.input}</pre>
                      </div>
                      <div style={S.exRow}>
                        <span style={S.exLabel}>Output</span>
                        <pre style={S.exCode}>{ex.expectedOutput}</pre>
                      </div>
                      {ex.explanation && (
                        <div style={S.exRow}>
                          <span style={S.exLabel}>Explanation</span>
                          <p style={S.exExpl}>{ex.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick stats */}
            <div style={S.quickStats}>
              {[
                { val: task.testCases?.length || 0, label: 'Test Cases' },
                { val: task.submissions?.length || 0, label: 'Submissions' },
                { val: task.examples?.length || 0, label: 'Examples' },
              ].map((s, i) => (
                <div key={i} style={S.qStatCard}>
                  <div style={S.qStatVal}>{s.val}</div>
                  <div style={S.qStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Solve button */}
            {role !== 'company' && (
              <button
                onClick={() => {
                  localStorage.setItem(`solve_task_${id}`, JSON.stringify({
                    id, title: task.title, description: task.description || '',
                    testCases: task.testCases || [], examples: task.examples || [],
                  }));
                  window.open(`/solve?taskId=${id}`, '_blank');
                }}
                style={S.solveBtn}
              >⚡ Solve Challenge →</button>
            )}
          </>
        )}

        {/* ═══ Leaderboard ═══ */}
        {tab === 'leaderboard' && role === 'company' && (
          <div style={S.section}>
            {!leaderboard?.leaderboard?.length ? (
              <div style={S.emptyBox}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 14 }}>🏆</span>
                <h4 style={S.emptyTitle}>No participants yet</h4>
                <p style={S.emptyDesc}>Rankings will appear after students solve this challenge.</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div style={S.lbStats}>
                  {[
                    { val: leaderboard.totalParticipants, label: 'Participants' },
                    { val: leaderboard.totalSubmissions, label: 'Submissions' },
                    { val: leaderboard.task?.testCasesCount || 0, label: 'Test Cases' },
                  ].map((s, i) => (
                    <div key={i} style={S.lbStatCard}>
                      <div style={S.lbStatVal}>{s.val}</div>
                      <div style={S.lbStatLabel}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Student</th>
                        <th style={S.th}>Score</th>
                        <th style={S.th}>Tests</th>
                        <th style={S.th}>Time Taken</th>
                        <th style={S.th}>Language</th>
                        <th style={S.th}>Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.leaderboard.map((e) => (
                        <tr key={e.rank} style={S.tr}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                        >
                          <td style={S.td}>
                            <span style={{
                              ...S.rank,
                              background: e.rank === 1 ? 'rgba(245,158,11,0.12)' : e.rank === 2 ? 'rgba(148,163,184,0.08)' : e.rank === 3 ? 'rgba(217,119,6,0.08)' : 'transparent',
                              color: e.rank === 1 ? '#f59e0b' : e.rank === 2 ? '#94a3b8' : e.rank === 3 ? '#d97706' : '#5a5a66',
                            }}>
                              {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                            </span>
                          </td>
                          <td style={S.td}><span style={S.tdBold}>{e.user?.username || 'Unknown'}</span></td>
                          <td style={S.td}><span style={{ color: scoreColor(e.score), fontWeight: 700 }}>{e.score}%</span></td>
                          <td style={S.td}><span style={S.tcBadge}>{e.testCasesPassed}/{e.totalTestCases}</span></td>
                          <td style={S.td}><span style={S.timeBadge}>{fmtTime(e.timeTakenSeconds)}</span></td>
                          <td style={S.td}><span style={S.langBadge}>{e.language}</span></td>
                          <td style={S.td}>{e.totalAttempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ All Submissions ═══ */}
        {tab === 'submissions' && role === 'company' && (
          <div style={S.section}>
            {submissions.length === 0 ? (
              <div style={S.emptyBox}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 14 }}>📭</span>
                <h4 style={S.emptyTitle}>No submissions yet</h4>
                <p style={S.emptyDesc}>Student submissions will appear here.</p>
              </div>
            ) : (
              <div style={S.subList}>
                {submissions.map((sub, i) => (
                  <div key={sub._id} style={S.subCard}>
                    <div style={S.subHeader} onClick={() => setExpandedSub(expandedSub === sub._id ? null : sub._id)}>
                      <div style={S.subLeftWrap}>
                        <span style={{
                          ...S.rank,
                          background: i === 0 ? 'rgba(245,158,11,0.12)' : i === 1 ? 'rgba(148,163,184,0.08)' : i === 2 ? 'rgba(217,119,6,0.08)' : 'transparent',
                          color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#5a5a66',
                        }}>
                          {i <= 2 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
                        </span>
                        <div>
                          <div style={S.subUser}>{sub.user?.username || 'Unknown'}</div>
                          <div style={S.subMeta}>
                            <span style={S.langBadge}>{sub.language || 'javascript'}</span>
                            {sub.timeTakenSeconds > 0 && <span style={S.timeBadge}>⏱ {fmtTime(sub.timeTakenSeconds)}</span>}
                            <span style={S.subDate}>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div style={S.subRightWrap}>
                        <div style={{ ...S.subScoreVal, color: scoreColor(sub.score) }}>{sub.score}</div>
                        <span style={S.expandIcon}>{expandedSub === sub._id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {expandedSub === sub._id && (
                      <div style={S.subExpanded}>
                        {/* Analysis badges */}
                        <div style={S.badgeRow}>
                          {sub.aiAnalysis?.timeComplexity && sub.aiAnalysis.timeComplexity !== 'N/A' && (
                            <span style={S.infoBadge}>⏱ Time: <strong>{sub.aiAnalysis.timeComplexity}</strong></span>
                          )}
                          {sub.aiAnalysis?.spaceComplexity && sub.aiAnalysis.spaceComplexity !== 'N/A' && (
                            <span style={S.infoBadge}>💾 Space: <strong>{sub.aiAnalysis.spaceComplexity}</strong></span>
                          )}
                          {sub.testCasesPassed !== undefined && (
                            <span style={{ ...S.infoBadge, color: '#10b981', borderColor: 'rgba(16,185,129,0.12)' }}>
                              ✓ {sub.testCasesPassed}/{sub.totalTestCases} passed
                            </span>
                          )}
                          {sub.timeTakenSeconds > 0 && (
                            <span style={{ ...S.infoBadge, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.12)' }}>
                              ⏱ {fmtTime(sub.timeTakenSeconds)}
                            </span>
                          )}
                        </div>

                        {sub.aiAnalysis?.feedback && (
                          <div style={S.fbBox}>
                            <strong style={{ color: '#a78bfa', fontSize: '0.72rem' }}>AI Feedback</strong>
                            <p style={S.fbText}>{sub.aiAnalysis.feedback}</p>
                          </div>
                        )}
                        {sub.aiAnalysis?.optimizationNotes && (
                          <div style={{ ...S.fbBox, borderColor: 'rgba(6,182,212,0.08)' }}>
                            <strong style={{ color: '#06b6d4', fontSize: '0.72rem' }}>Optimization Notes</strong>
                            <p style={S.fbText}>{sub.aiAnalysis.optimizationNotes}</p>
                          </div>
                        )}
                        <pre style={S.codeBlock}>{sub.code || '(No code saved)'}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Styles ── */
const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '48px 24px', background: '#0a0a0f' },
  container: { maxWidth: 860, margin: '0 auto' },
  centerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText: { color: '#5a5a66', marginTop: 16, fontSize: '0.88rem' },
  errorBox: { padding: '14px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, color: '#ef4444', fontSize: '0.88rem' },

  // Header
  header: { marginBottom: 32 },
  tag: { display: 'inline-block', padding: '3px 10px', borderRadius: 50, background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.3px', margin: '0 0 10px' },
  desc: { fontSize: '0.95rem', color: '#94949e', lineHeight: 1.7, margin: 0 },
  miniStats: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 },
  miniItem: { fontSize: '0.82rem', color: '#94949e' },
  miniDivider: { width: 1, height: 18, background: 'rgba(255,255,255,0.06)' },
  resultBanner: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, marginBottom: 28 },
  resultLabel: { fontSize: '0.78rem', color: '#10b981', fontWeight: 600 },
  resultVal: { fontSize: '1rem', color: '#f1f1f3', fontWeight: 700 },

  // Tabs
  tabBar: { display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  tabBtn: { padding: '10px 18px', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: '#5a5a66', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease' },
  tabActive: { color: '#f1f1f3', borderBottomColor: '#8b5cf6' },

  // Section
  section: { marginBottom: 32 },
  secTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#f1f1f3', margin: '0 0 16px' },

  // Examples
  exCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  exHeader: { padding: '10px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' },
  exBody: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  exRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  exLabel: { fontSize: '0.68rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.5 },
  exCode: { fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '0.85rem', color: '#06b6d4', background: 'rgba(6,182,212,0.05)', padding: '8px 12px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap', border: '1px solid rgba(6,182,212,0.08)' },
  exExpl: { fontSize: '0.85rem', color: '#94949e', lineHeight: 1.5, margin: 0 },

  // Quick stats
  quickStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 },
  qStatCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '18px', textAlign: 'center' },
  qStatVal: { fontSize: '1.4rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 4 },
  qStatLabel: { fontSize: '0.7rem', color: '#5a5a66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Solve
  solveBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(139,92,246,0.2)', transition: 'all 0.2s ease' },

  // Leaderboard stats
  lbStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  lbStatCard: { textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 },
  lbStatVal: { fontSize: '1.3rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 4 },
  lbStatLabel: { fontSize: '0.68rem', color: '#5a5a66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Table
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  tr: { transition: 'background 0.12s ease' },
  td: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.82rem', color: '#94949e' },
  tdBold: { color: '#f1f1f3', fontWeight: 600 },
  rank: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 50, fontSize: '0.78rem', fontWeight: 700 },
  tcBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16,185,129,0.06)', color: '#10b981' },
  timeBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245,158,11,0.06)', color: '#f59e0b' },
  langBadge: { padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600, background: 'rgba(139,92,246,0.06)', color: '#a78bfa', textTransform: 'capitalize' },

  // Submissions
  emptyBox: { textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 },
  emptyTitle: { color: '#f1f1f3', marginBottom: 6, fontWeight: 600, fontSize: '1rem' },
  emptyDesc: { color: '#5a5a66', fontSize: '0.85rem', margin: 0 },
  subList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' },
  subHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', transition: 'background 0.12s' },
  subLeftWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  subUser: { fontSize: '0.9rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 3 },
  subMeta: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  subDate: { fontSize: '0.68rem', color: '#5a5a66' },
  subRightWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  subScoreVal: { fontSize: '1.3rem', fontWeight: 700 },
  expandIcon: { color: '#5a5a66', fontSize: '0.65rem' },

  // Expanded
  subExpanded: { borderTop: '1px solid rgba(255,255,255,0.04)' },
  badgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  infoBadge: { padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, color: '#94949e', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', gap: 4 },
  fbBox: { padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(139,92,246,0.02)' },
  fbText: { margin: '4px 0 0', fontSize: '0.78rem', color: '#94949e', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  codeBlock: { fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '0.78rem', color: '#c4c4cc', background: '#0c0c14', padding: '16px 18px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 360, overflowY: 'auto', lineHeight: 1.6 },
};

export default TaskDetail;