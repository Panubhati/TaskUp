import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const QuizLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || role !== 'company') {
      navigate('/login');
      return;
    }
    fetchLeaderboard();
    // eslint-disable-next-line
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${id}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leaderboard');
    }
    setLoading(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getScoreColor = (pct) => {
    if (pct >= 80) return '#10b981';
    if (pct >= 60) return '#06b6d4';
    if (pct >= 40) return '#f59e0b';
    return '#f43f5e';
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return { background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,183,0,0.08))', borderColor: 'rgba(255,215,0,0.3)' };
    if (rank === 2) return { background: 'linear-gradient(135deg, rgba(192,192,192,0.12), rgba(169,169,169,0.06))', borderColor: 'rgba(192,192,192,0.25)' };
    if (rank === 3) return { background: 'linear-gradient(135deg, rgba(205,127,50,0.12), rgba(205,127,50,0.06))', borderColor: 'rgba(205,127,50,0.25)' };
    return {};
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: 16, fontSize: '0.9rem' }}>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <button style={S.backBtn} onClick={() => navigate('/quizzes')}>← Back to Quizzes</button>

        {error && <div style={S.errorBox}><span>⚠</span> {error}</div>}

        {data && (
          <>
            {/* Header */}
            <div style={S.header}>
              <div style={S.tag}>QUIZ LEADERBOARD</div>
              <h1 style={S.title}>🏆 {data.quizTitle}</h1>
              <p style={S.subtitle}>Only you (the quiz creator) can see this leaderboard</p>
            </div>

            {/* Stats Cards */}
            <div style={S.statsGrid}>
              <div style={S.statCard}>
                <div style={S.statIcon}>👥</div>
                <div style={S.statValue}>{data.totalParticipants}</div>
                <div style={S.statLabel}>Participants</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon}>📝</div>
                <div style={S.statValue}>{data.totalQuestions}</div>
                <div style={S.statLabel}>Questions</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon}>📊</div>
                <div style={{
                  ...S.statValue,
                  color: getScoreColor(data.avgPercentage),
                }}>{data.avgPercentage}%</div>
                <div style={S.statLabel}>Avg Score</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon}>⏱</div>
                <div style={S.statValue}>{formatTime(data.avgTimeTaken)}</div>
                <div style={S.statLabel}>Avg Time</div>
              </div>
            </div>

            {/* Leaderboard Table */}
            {data.leaderboard.length > 0 ? (
              <div style={S.tableCard}>
                <div style={S.tableGradient}></div>
                <div style={S.tableHeader}>
                  <div style={{ ...S.th, width: 60 }}>Rank</div>
                  <div style={{ ...S.th, flex: 1 }}>Student</div>
                  <div style={{ ...S.th, width: 90, textAlign: 'center' }}>Score</div>
                  <div style={{ ...S.th, width: 100, textAlign: 'center' }}>Percentage</div>
                  <div style={{ ...S.th, width: 90, textAlign: 'center' }}>Time</div>
                  <div style={{ ...S.th, width: 130, textAlign: 'right' }}>Submitted</div>
                </div>

                {data.leaderboard.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      ...S.tableRow,
                      ...getRankStyle(entry.rank),
                      animationDelay: `${i * 0.04}s`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => {
                      const rs = getRankStyle(entry.rank);
                      e.currentTarget.style.background = rs.background || 'transparent';
                    }}
                  >
                    <div style={{ ...S.td, width: 60 }}>
                      <span style={{
                        fontSize: entry.rank <= 3 ? '1.2rem' : '0.85rem',
                        fontWeight: 700,
                        color: entry.rank <= 3 ? '#f1f1f3' : '#5a5a66',
                      }}>
                        {getRankEmoji(entry.rank)}
                      </span>
                    </div>
                    <div style={{ ...S.td, flex: 1 }}>
                      <div style={S.userName}>{entry.user?.username || 'Unknown'}</div>
                      {entry.user?.college && (
                        <div style={S.userCollege}>{entry.user.college}</div>
                      )}
                    </div>
                    <div style={{ ...S.td, width: 90, textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#f1f1f3' }}>{entry.score}</span>
                      <span style={{ color: '#5a5a66' }}>/{entry.totalPoints}</span>
                    </div>
                    <div style={{ ...S.td, width: 100, textAlign: 'center' }}>
                      <div style={S.percentBar}>
                        <div style={{
                          ...S.percentFill,
                          width: `${entry.percentage}%`,
                          background: getScoreColor(entry.percentage),
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: getScoreColor(entry.percentage) }}>
                        {entry.percentage}%
                      </span>
                    </div>
                    <div style={{ ...S.td, width: 90, textAlign: 'center', color: '#94949e', fontSize: '0.82rem' }}>
                      {formatTime(entry.timeTakenSeconds)}
                    </div>
                    <div style={{ ...S.td, width: 130, textAlign: 'right', color: '#5a5a66', fontSize: '0.78rem' }}>
                      {new Date(entry.submittedAt).toLocaleDateString()} {new Date(entry.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={S.emptyState}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>📊</span>
                <h3 style={{ color: '#f1f1f3', marginBottom: 8, fontWeight: 600 }}>No submissions yet</h3>
                <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>
                  Students haven't attempted this quiz yet. Share it and check back later.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0, fontWeight: 500 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },

  header: { marginBottom: 28 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.85rem', color: '#5a5a66', fontStyle: 'italic' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 },
  statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' },
  statIcon: { fontSize: '1.4rem', marginBottom: 8 },
  statValue: { fontSize: '1.5rem', fontWeight: 800, color: '#f1f1f3', marginBottom: 4 },
  statLabel: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 },

  tableCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' },
  tableGradient: { height: 3, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)' },
  tableHeader: { display: 'flex', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' },
  th: { fontSize: '0.7rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { display: 'flex', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', transition: 'all 0.2s ease', cursor: 'default', animation: 'fadeIn 0.3s ease forwards', opacity: 0 },
  td: { fontSize: '0.88rem' },
  userName: { fontWeight: 600, color: '#f1f1f3', fontSize: '0.9rem' },
  userCollege: { fontSize: '0.72rem', color: '#5a5a66', marginTop: 2 },

  percentBar: { width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 },
  percentFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },

  emptyState: { textAlign: 'center', padding: '80px 24px' },
};

export default QuizLeaderboard;
