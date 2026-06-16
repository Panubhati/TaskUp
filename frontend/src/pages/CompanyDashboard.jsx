import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const CompanyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username') || 'Company';


  useEffect(() => {
    if (!token || role !== 'company') { navigate('/login'); return; }
    fetchDashboard();
    // eslint-disable-next-line
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/company/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    }
    setLoading(false);
  };

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
  const plagColor = (s) => s <= 20 ? '#10b981' : s <= 50 ? '#f59e0b' : '#ef4444';

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={S.loadingText}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.errorBox}>⚠️ {error}</div>
        </div>
      </div>
    );
  }

  const o = data?.overview || {};
  const dist = data?.scoreDistribution || {};
  const totalDist = (dist.excellent || 0) + (dist.good || 0) + (dist.average || 0) + (dist.poor || 0) || 1;

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={S.tag}>DASHBOARD</span>
            <h1 style={S.title}>Welcome, {username}</h1>
            <p style={S.subtitle}>Your assessments & candidate performance overview</p>
          </div>
          <div style={S.headerRight}>
            <button onClick={() => navigate('/create')} style={S.btnOutline}>+ New Task</button>
            <button onClick={() => navigate('/question-bank')} style={S.btnOutline}>Question Bank</button>
            <button onClick={() => navigate('/assignments')} style={S.btnPrimary}>Assignments</button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={S.statGrid}>
          {[
            { icon: '📋', val: o.totalAssignments || 0, label: 'Assignments' },
            { icon: '📝', val: o.totalTasks || 0, label: 'Tasks' },
            { icon: '📝', val: o.totalAssessments || 0, label: 'Assessments' },
            { icon: '👥', val: o.totalParticipants || 0, label: 'Candidates' },
            { icon: '📊', val: o.totalSubmissions || 0, label: 'Submissions' },
            { icon: '🎯', val: `${o.avgFinalScore || 0}%`, label: 'Avg Score' },
          ].map((s, i) => (
            <div key={i} style={S.statCard}>
              <div style={S.statIcon}>{s.icon}</div>
              <div style={S.statVal}>{s.val}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Average Performance Bars ── */}
        {o.totalSubmissions > 0 && (
          <div style={S.section}>
            <h3 style={S.secTitle}>Performance Overview</h3>
            <div style={S.perfGrid}>
              <div style={S.perfCard}>
                <div style={S.perfHeader}>
                  <span style={S.perfLabel}>Correctness</span>
                  <span style={{ ...S.perfVal, color: scoreColor(o.avgCorrectness || 0) }}>{o.avgCorrectness || 0}%</span>
                </div>
                <div style={S.barBg}><div style={{ ...S.barFill, width: `${o.avgCorrectness || 0}%`, background: '#10b981' }}></div></div>
              </div>
              {o.avgOptimization !== null && o.avgOptimization !== undefined && (
                <div style={S.perfCard}>
                  <div style={S.perfHeader}>
                    <span style={S.perfLabel}>Optimization</span>
                    <span style={{ ...S.perfVal, color: '#06b6d4' }}>{o.avgOptimization}%</span>
                  </div>
                  <div style={S.barBg}><div style={{ ...S.barFill, width: `${o.avgOptimization}%`, background: '#06b6d4' }}></div></div>
                </div>
              )}
              {o.avgPlagiarism !== null && o.avgPlagiarism !== undefined && (
                <div style={S.perfCard}>
                  <div style={S.perfHeader}>
                    <span style={S.perfLabel}>Plagiarism</span>
                    <span style={{ ...S.perfVal, color: plagColor(o.avgPlagiarism) }}>{o.avgPlagiarism}%</span>
                  </div>
                  <div style={S.barBg}><div style={{ ...S.barFill, width: `${o.avgPlagiarism}%`, background: plagColor(o.avgPlagiarism) }}></div></div>
                </div>
              )}
              <div style={S.perfCard}>
                <div style={S.perfHeader}>
                  <span style={S.perfLabel}>Overall Score</span>
                  <span style={{ ...S.perfVal, color: '#a78bfa' }}>{o.avgFinalScore || 0}%</span>
                </div>
                <div style={S.barBg}><div style={{ ...S.barFill, width: `${o.avgFinalScore || 0}%`, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)' }}></div></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Two-column: Distribution + Top Performers ── */}
        <div style={S.row2}>
          <div style={S.card}>
            <h3 style={S.secTitle}>Score Distribution</h3>
            {o.totalSubmissions === 0 ? (
              <p style={S.empty}>No submissions yet</p>
            ) : (
              <div style={S.distList}>
                {[
                  { label: 'Excellent (80–100)', val: dist.excellent || 0, color: '#10b981' },
                  { label: 'Good (60–79)', val: dist.good || 0, color: '#06b6d4' },
                  { label: 'Average (40–59)', val: dist.average || 0, color: '#f59e0b' },
                  { label: 'Poor (0–39)', val: dist.poor || 0, color: '#ef4444' },
                ].map((d, i) => (
                  <div key={i} style={S.distRow}>
                    <span style={S.distLabel}>{d.label}</span>
                    <div style={S.distBarWrap}>
                      <div style={{ ...S.distBar, width: `${(d.val / totalDist) * 100}%`, background: d.color }}></div>
                    </div>
                    <span style={{ ...S.distCount, color: d.color }}>{d.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={S.card}>
            <h3 style={S.secTitle}>Top Performers</h3>
            {(!data?.topPerformers?.length) ? (
              <p style={S.empty}>No data yet</p>
            ) : (
              <div style={S.topList}>
                {data.topPerformers.slice(0, 8).map((p, i) => (
                  <div key={i} style={S.topRow}>
                    <span style={{
                      ...S.topRank,
                      background: i === 0 ? 'rgba(245,158,11,0.12)' : i === 1 ? 'rgba(148,163,184,0.08)' : i === 2 ? 'rgba(217,119,6,0.08)' : 'rgba(255,255,255,0.03)',
                      color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#5a5a66',
                    }}>
                      {i <= 2 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...S.topName, cursor: p.userId ? 'pointer' : 'default' }} onClick={() => p.userId && navigate(`/candidate/${p.userId}`)}>{p.username} <span style={{ fontSize: '0.62rem', color: '#8b5cf6', fontWeight: 500 }}>View →</span></div>
                      <div style={S.topMeta}>{p.count} submissions</div>
                    </div>
                    <span style={{ ...S.topScore, color: scoreColor(p.avgScore) }}>{p.avgScore}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Assignment Table ── */}
        {data?.assignmentBreakdown?.length > 0 && (
          <div style={S.section}>
            <h3 style={S.secTitle}>Assignments</h3>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Title</th>
                    <th style={S.th}>Questions</th>
                    <th style={S.th}>Participants</th>
                    <th style={S.th}>Submissions</th>
                    <th style={S.th}>Avg Score</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.assignmentBreakdown.map((a) => {
                    const expired = a.deadline && new Date(a.deadline) < new Date();
                    return (
                      <tr key={a._id} style={S.tr} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={S.td}><span style={S.tdBold}>{a.title}</span></td>
                        <td style={S.td}>{a.questionCount}</td>
                        <td style={S.td}>{a.participantCount}</td>
                        <td style={S.td}>{a.submissionCount}</td>
                        <td style={S.td}>
                          <span style={{ color: scoreColor(a.avgScore), fontWeight: 600 }}>{a.avgScore}%</span>
                        </td>
                        <td style={S.td}>
                          <span style={{
                            ...S.statusPill,
                            background: expired ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                            color: expired ? '#ef4444' : '#10b981',
                          }}>
                            {expired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <button onClick={() => navigate(`/assignments/${a._id}`)} style={S.viewBtn}>View →</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Recent Activity ── */}
        {data?.recentSubmissions?.length > 0 && (
          <div style={S.section}>
            <h3 style={S.secTitle}>Recent Activity</h3>
            <div style={S.activityWrap}>
              {data.recentSubmissions.map((s, i) => (
                <div key={i} style={S.actRow}>
                  <div style={S.actDot}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...S.actUser, cursor: s.user?._id ? 'pointer' : 'default', borderBottom: s.user?._id ? '1px dashed rgba(139,92,246,0.3)' : 'none' }} onClick={() => s.user?._id && navigate(`/candidate/${s.user._id}`)}>{s.user?.username || 'Unknown'}</span>
                    <span style={S.actText}> submitted to </span>
                    <span style={S.actTarget}>{s.assignmentTitle || s.taskTitle}</span>
                  </div>
                  <span style={{ ...S.actScore, color: scoreColor(s.score) }}>{s.score}</span>
                  <span style={S.actLang}>{s.language}</span>
                  <span style={S.actDate}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {o.totalSubmissions === 0 && o.totalAssignments === 0 && o.totalTasks === 0 && (o.totalAssessments || 0) === 0 && (
          <div style={S.emptyState}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 16 }}>🚀</span>
            <h3 style={{ color: '#f1f1f3', marginBottom: 8, fontWeight: 600 }}>Get Started!</h3>
            <p style={{ color: '#5a5a66', fontSize: '0.88rem', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
              Create your first assignment or task to start assessing candidates.
            </p>
            <button onClick={() => navigate('/question-bank')} style={S.btnPrimary}>
              Browse Question Bank →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Styles ── */
const S = {
  page: { minHeight: '100vh', padding: '48px 24px', background: 'var(--bg-primary, #0a0a0f)' },
  container: { maxWidth: 1120, margin: '0 auto' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' },
  spinner: { width: 36, height: 36, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#5a5a66', marginTop: 18, fontSize: '0.88rem' },
  errorBox: { padding: '14px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, color: '#ef4444', fontSize: '0.88rem' },

  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 20 },
  headerLeft: {},
  headerRight: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
  tag: { display: 'inline-block', padding: '3px 10px', borderRadius: 50, background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 },
  title: { fontSize: '1.6rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.3px', margin: '0 0 6px' },
  subtitle: { fontSize: '0.88rem', color: '#5a5a66', margin: 0 },
  btnOutline: { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: '#94949e', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease' },
  btnPrimary: { padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 12px rgba(139,92,246,0.2)' },

  // Stat Cards
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 32 },
  statCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px 14px', textAlign: 'center' },
  statIcon: { fontSize: '1.2rem', marginBottom: 8, opacity: 0.8 },
  statVal: { fontSize: '1.5rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 4 },
  statLabel: { fontSize: '0.68rem', color: '#5a5a66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  section: { marginBottom: 32 },
  secTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 16, margin: '0 0 16px' },

  // Performance bars
  perfGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  perfCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 16px' },
  perfHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  perfLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.3 },
  perfVal: { fontSize: '1rem', fontWeight: 700 },
  barBg: { height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s ease' },

  // Two-column
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 },
  card: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '20px 22px' },
  empty: { color: '#5a5a66', fontSize: '0.85rem', textAlign: 'center', padding: '28px 0' },

  // Distribution
  distList: { display: 'flex', flexDirection: 'column', gap: 16 },
  distRow: { display: 'flex', alignItems: 'center', gap: 12 },
  distLabel: { fontSize: '0.78rem', color: '#94949e', fontWeight: 500, minWidth: 130, flexShrink: 0 },
  distBarWrap: { flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  distBar: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease', minWidth: 2 },
  distCount: { fontSize: '0.82rem', fontWeight: 700, minWidth: 20, textAlign: 'right' },

  // Top performers
  topList: { display: 'flex', flexDirection: 'column', gap: 0 },
  topRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  topRank: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 50, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 },
  topName: { fontSize: '0.85rem', fontWeight: 600, color: '#f1f1f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topMeta: { fontSize: '0.68rem', color: '#5a5a66' },
  topScore: { fontSize: '1rem', fontWeight: 700, flexShrink: 0 },

  // Table
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  tr: { transition: 'background 0.12s ease' },
  td: { padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.83rem', color: '#94949e' },
  tdBold: { color: '#f1f1f3', fontWeight: 600 },
  statusPill: { padding: '3px 10px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 600, display: 'inline-block' },
  viewBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.15)', background: 'transparent', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  // Activity
  activityWrap: { borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' },
  actRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.015)' },
  actDot: { width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 },
  actUser: { fontSize: '0.82rem', fontWeight: 600, color: '#f1f1f3' },
  actText: { fontSize: '0.82rem', color: '#5a5a66' },
  actTarget: { color: '#a78bfa', fontWeight: 500, fontSize: '0.82rem' },
  actScore: { fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 },
  actLang: { padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.06)', color: '#a78bfa', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 },
  actDate: { fontSize: '0.68rem', color: '#5a5a66', flexShrink: 0 },

  emptyState: { textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 },
};

export default CompanyDashboard;
