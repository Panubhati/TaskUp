import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('questions'); // questions | leaderboard

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  const fetchData = async () => {
    try {
      const [aRes, lRes] = await Promise.all([
        axios.get(`${API}/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/assignments/${id}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setAssignment(aRes.data);
      setLeaderboard(lRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assignment');
    }
    setLoading(false);
  };

  const solveQuestion = (question) => {
    // Store full question data for the solve page
    const taskData = {
      title: question.title,
      description: question.description || '',
      difficulty: question.difficulty || '',
      category: question.category || '',
      tags: question.tags || [],
      constraints: question.constraints || '',
      testCases: question.testCases || [],
      examples: question.examples || [],
    };
    // Store assignment metadata for timer + submission limits
    const assignMeta = {
      assignmentId: id,
      questionId: question._id,
      timeLimitMinutes: assignment.timeLimitMinutes || 0,
      maxSubmissions: assignment.maxSubmissions || 2,
      assignmentTitle: assignment.title,
    };
    localStorage.setItem(`solve_task_${question._id}`, JSON.stringify(taskData));
    localStorage.setItem(`solve_assignment_meta`, JSON.stringify(assignMeta));
    navigate(`/solve?taskId=${question._id}&assignmentId=${id}`);
  };

  const diffColor = (d) => d === 'Easy' ? '#10b981' : d === 'Medium' ? '#f59e0b' : '#f43f5e';

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#f43f5e';
  const plagColor = (s) => s <= 20 ? '#10b981' : s <= 50 ? '#f59e0b' : '#f43f5e';

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: 16 }}>Loading assignment...</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div style={S.page}>
        <div style={S.errorBox}><span>⚠</span> {error || 'Assignment not found'}</div>
      </div>
    );
  }

  const isExpired = assignment.deadline && new Date(assignment.deadline) < new Date();

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <button onClick={() => navigate('/assignments')} style={S.backBtn}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={S.tag}>{role === 'company' ? 'YOUR ASSESSMENT' : 'CODING ASSESSMENT'}</div>
            <h1 style={S.title}>{assignment.title}</h1>
            {assignment.description && <p style={S.subtitle}>{assignment.description}</p>}
            <div style={S.metaRow}>
              <span style={S.metaChip}>📋 {assignment.questions?.length || 0} questions</span>
              <span style={S.metaChip}>👥 {leaderboard?.totalParticipants || 0} participants</span>
              {assignment.stats && (
                <span style={{ ...S.metaChip, color: '#10b981', background: 'rgba(16,185,129,0.08)' }}>
                  ✅ {assignment.stats.totalSolved} solved
                </span>
              )}
              {assignment.stats && assignment.stats.activeSolvers > 0 && (
                <span style={{ ...S.metaChip, color: '#06b6d4', background: 'rgba(6,182,212,0.08)' }}>
                  🔴 {assignment.stats.activeSolvers} solving now
                </span>
              )}
              {assignment.company?.username && <span style={S.metaChip}>🏢 {assignment.company.username}</span>}
              {assignment.timeLimitMinutes > 0 && (
                <span style={{ ...S.metaChip, color: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
                  ⏱ {assignment.timeLimitMinutes} min per question
                </span>
              )}
              <span style={S.metaChip}>📝 Max {assignment.maxSubmissions || 2} submissions</span>
              {assignment.deadline && (
                <span style={{ ...S.metaChip, color: isExpired ? '#f43f5e' : '#10b981' }}>
                  ⏰ {isExpired ? 'Expired' : `Due: ${new Date(assignment.deadline).toLocaleDateString()}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          <button style={{ ...S.tabBtn, ...(tab === 'questions' ? S.tabActive : {}) }}
            onClick={() => setTab('questions')}>
            📝 Questions ({assignment.questions?.length || 0})
          </button>
          <button style={{ ...S.tabBtn, ...(tab === 'leaderboard' ? S.tabActive : {}) }}
            onClick={() => setTab('leaderboard')}>
            🏆 Leaderboard ({leaderboard?.totalParticipants || 0})
          </button>
        </div>

        {/* Questions Tab */}
        {tab === 'questions' && (
          <div style={S.questionList}>
            {assignment.questions?.map((q, i) => (
              <div key={q._id} style={S.qCard}>
                <div style={S.qCardTop}>
                  <div>
                    <div style={S.qBadges}>
                      <span style={{ ...S.diffBadge, background: `${diffColor(q.difficulty)}15`, color: diffColor(q.difficulty), border: `1px solid ${diffColor(q.difficulty)}30` }}>
                        {q.difficulty}
                      </span>
                      <span style={S.catBadge}>{q.category}</span>
                    </div>
                    <h3 style={S.qTitle}>{i + 1}. {q.title}</h3>
                    <p style={S.qDesc}>{q.description?.substring(0, 200)}{q.description?.length > 200 ? '...' : ''}</p>
                  </div>
                  {role === 'student' && !isExpired && (
                    <button onClick={() => solveQuestion(q)} style={S.solveBtn}>Solve →</button>
                  )}
                </div>
                {q.tags && (
                  <div style={S.qTags}>
                    {q.tags.map(t => <span key={t} style={S.tagChip}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div style={S.leaderboardWrap}>
            {!leaderboard?.leaderboard?.length ? (
              <div style={S.emptyState}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🏆</span>
                <h3 style={{ color: '#f1f1f3', marginBottom: 8 }}>No submissions yet</h3>
                <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>Rankings will appear after students submit solutions.</p>
              </div>
            ) : (
              <>
                {/* Scoring info */}
                <div style={S.scoringInfo}>
                  <strong style={{ color: '#a78bfa', fontSize: '0.75rem' }}>📊 Scoring Formula</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#5a5a66', lineHeight: 1.5 }}>
                    <span style={{ color: '#10b981' }}>50% Correctness</span> + <span style={{ color: '#06b6d4' }}>30% Optimization</span> + <span style={{ color: '#f59e0b' }}>20% Originality</span> (100 - plagiarism)
                  </p>
                </div>

                {/* Leaderboard Table */}
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Rank</th>
                        <th style={S.th}>User</th>
                        <th style={S.th}>Solved</th>
                        <th style={{ ...S.th, color: '#10b981' }}>Correctness</th>
                        <th style={{ ...S.th, color: '#06b6d4' }}>Optimization</th>
                        <th style={{ ...S.th, color: '#f59e0b' }}>Plagiarism</th>
                        <th style={{ ...S.th, color: '#a78bfa' }}>Final Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.leaderboard.map((entry) => (
                        <tr key={entry.user._id} style={S.tr}>
                          <td style={S.td}>
                            <span style={{ ...S.rankBadge, background: entry.rank === 1 ? 'rgba(245,158,11,0.15)' : entry.rank === 2 ? 'rgba(148,163,184,0.1)' : entry.rank === 3 ? 'rgba(217,119,6,0.1)' : 'rgba(255,255,255,0.03)', color: entry.rank === 1 ? '#f59e0b' : entry.rank === 2 ? '#94a3b8' : entry.rank === 3 ? '#d97706' : '#5a5a66' }}>
                              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={S.userName}>{entry.user.username}</span>
                          </td>
                          <td style={S.td}>
                            <span style={S.solvedChip}>{entry.questionsAttempted}/{leaderboard.totalQuestions}</span>
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.scoreVal, color: scoreColor(entry.avgCorrectness) }}>{entry.avgCorrectness}%</span>
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.scoreVal, color: scoreColor(entry.avgOptimization) }}>{entry.avgOptimization}%</span>
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.scoreVal, color: plagColor(entry.avgPlagiarism) }}>{entry.avgPlagiarism}%</span>
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.finalScore, color: scoreColor(entry.avgFinalScore) }}>{entry.avgFinalScore}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detailed submissions for company */}
                {role === 'company' && leaderboard.leaderboard.map(entry => (
                  <div key={entry.user._id} style={S.detailCard}>
                    <div style={S.detailHeader}>
                      <span style={S.detailRank}>#{entry.rank}</span>
                      <span style={S.detailName}>{entry.user.username}</span>
                      <span style={{ ...S.finalScoreBig, color: scoreColor(entry.avgFinalScore) }}>Score: {entry.avgFinalScore}</span>
                    </div>
                    {entry.submissions.map((sub, si) => (
                      <div key={si} style={S.subRow}>
                        <span style={S.subQ}>Q{si + 1}</span>
                        <span style={S.subLang}>{sub.language}</span>
                        <span style={{ fontSize: '0.72rem', color: scoreColor(sub.correctnessScore) }}>✓{sub.testCasesPassed}/{sub.totalTestCases}</span>
                        <span style={{ fontSize: '0.72rem', color: '#06b6d4' }}>⚡{sub.optimizationScore}%</span>
                        <span style={{ fontSize: '0.72rem', color: plagColor(sub.plagiarismScore) }}>🔍{sub.plagiarismScore}%</span>
                        {sub.aiAnalysis?.timeComplexity && <span style={S.complexity}>⏱ {sub.aiAnalysis.timeComplexity}</span>}
                        {sub.aiAnalysis?.spaceComplexity && <span style={S.complexity}>💾 {sub.aiAnalysis.spaceComplexity}</span>}
                        {sub.aiAnalysis?.feedback && <span style={S.plagNote}>💡 {sub.aiAnalysis.feedback.substring(0, 80)}</span>}
                        {sub.aiAnalysis?.plagiarismNotes && <span style={S.plagNote}>{sub.aiAnalysis.plagiarismNotes.substring(0, 60)}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8 },

  header: { display: 'flex', gap: 16, marginBottom: 28, alignItems: 'flex-start' },
  backBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94949e', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.88rem', color: '#6b6b78', lineHeight: 1.5, marginBottom: 10 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  metaChip: { padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66' },

  tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 },
  tabBtn: { padding: '10px 20px', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: '#5a5a66', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' },
  tabActive: { color: '#f1f1f3', borderBottomColor: '#8b5cf6', background: 'rgba(139,92,246,0.04)' },

  // Questions
  questionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  qCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' },
  qCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  qBadges: { display: 'flex', gap: 6, marginBottom: 8 },
  diffBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700 },
  catBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' },
  qTitle: { fontSize: '1rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 6 },
  qDesc: { fontSize: '0.82rem', color: '#6b6b78', lineHeight: 1.5 },
  solveBtn: { padding: '8px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 },
  qTags: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 },
  tagChip: { padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66', border: '1px solid rgba(255,255,255,0.06)' },

  // Leaderboard
  leaderboardWrap: { width: '100%' },
  scoringInfo: { padding: '12px 16px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 10, marginBottom: 16 },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  tr: { transition: 'background 0.15s ease' },
  td: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' },
  rankBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 700, minWidth: 36 },
  userName: { color: '#f1f1f3', fontWeight: 600 },
  solvedChip: { padding: '2px 8px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(6,182,212,0.08)', color: '#06b6d4' },
  scoreVal: { fontWeight: 700, fontSize: '0.85rem' },
  finalScore: { fontWeight: 800, fontSize: '1rem' },

  // Detail cards
  detailCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailRank: { fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' },
  detailName: { fontSize: '0.92rem', fontWeight: 600, color: '#f1f1f3', flex: 1 },
  finalScoreBig: { fontWeight: 700, fontSize: '0.88rem' },
  subRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' },
  subQ: { fontSize: '0.72rem', fontWeight: 700, color: '#5a5a66', minWidth: 24 },
  subLang: { fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontWeight: 600 },
  complexity: { fontSize: '0.68rem', color: '#5a5a66', fontStyle: 'italic' },
  plagNote: { fontSize: '0.68rem', color: '#f59e0b', fontStyle: 'italic' },

  emptyState: { textAlign: 'center', padding: '60px 24px' },
};

export default AssignmentDetail;
