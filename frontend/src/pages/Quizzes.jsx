import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchQuizzes();
    // eslint-disable-next-line
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get(`${API}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuizzes(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quizzes');
    }
    setLoading(false);
  };

  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: 16, fontSize: '0.9rem' }}>Loading quizzes...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.tag}>{role === 'company' ? 'YOUR QUIZZES' : 'AVAILABLE QUIZZES'}</div>
            <h1 style={S.title}>🧠 Quizzes</h1>
            <p style={S.subtitle}>{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available</p>
          </div>
          {role === 'company' && (
            <button style={S.createBtn} onClick={() => navigate('/quizzes/create')}>
              + Create Quiz
            </button>
          )}
        </div>

        {error && <div style={S.errorBox}><span>⚠</span> {error}</div>}

        {/* Quiz Cards */}
        <div style={S.grid}>
          {quizzes.map((quiz, i) => {
            const attempted = quiz.hasAttempted;
            const isBanned = quiz.isBanned;
            return (
              <div
                key={quiz._id}
                style={{ ...S.card, animationDelay: `${i * 0.06}s` }}
                onClick={() => {
                  if (isBanned) return; // Prevent navigation for banned students
                  if (role === 'company') {
                    navigate(`/quizzes/${quiz._id}/leaderboard`);
                  } else {
                    navigate(`/quizzes/${quiz._id}`);
                  }
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Gradient top bar */}
                <div style={S.cardGradientBar}></div>

                <div style={S.cardBody}>
                  <div style={S.cardHeader}>
                    <div style={S.cardIcon}>🧠</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={S.cardTitle}>{quiz.title}</h3>
                      {quiz.description && (
                        <p style={S.cardDesc}>
                          {quiz.description.substring(0, 80)}{quiz.description.length > 80 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    {attempted && !isBanned && (
                      <div style={S.completedBadge}>✓ Done</div>
                    )}
                    {isBanned && (
                      <div style={S.bannedBadge}>🚫 Banned</div>
                    )}
                  </div>

                  <div style={S.cardMeta}>
                    <span style={S.metaChip}>📝 {quiz.totalQuestions || quiz.questions?.length || 0} questions</span>
                    <span style={S.metaChip}>⏱ {formatTime(quiz.timeLimitMinutes)}</span>
                    {role === 'company' && (
                      <>
                        <span style={S.metaChip}>👥 {quiz.uniqueParticipants || 0} participants</span>
                        <span style={S.metaChip}>📊 {quiz.totalSubmissions || 0} submissions</span>
                      </>
                    )}
                    {quiz.company?.username && role === 'student' && (
                      <span style={S.metaChip}>🏢 {quiz.company.username}</span>
                    )}
                  </div>

                  {/* Student score if attempted */}
                  {attempted && quiz.myPercentage !== undefined && (
                    <div style={S.scoreBar}>
                      <div style={S.scoreLabel}>Your Score</div>
                      <div style={S.scoreFill}>
                        <div style={{
                          ...S.scoreProgress,
                          width: `${quiz.myPercentage}%`,
                          background: quiz.myPercentage >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                            quiz.myPercentage >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                              'linear-gradient(90deg, #f43f5e, #fb7185)',
                        }}></div>
                      </div>
                      <span style={{
                        ...S.scorePercent,
                        color: quiz.myPercentage >= 70 ? '#10b981' : quiz.myPercentage >= 40 ? '#f59e0b' : '#f43f5e',
                      }}>{quiz.myPercentage}%</span>
                    </div>
                  )}

                  <div style={S.cardFooter}>
                    <span style={isBanned ? S.cardActionBanned : S.cardAction}>
                      {isBanned ? '🚫 Banned — Tab Switching Violation' : role === 'company' ? 'View Leaderboard →' : attempted ? 'View Results →' : 'Start Quiz →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {quizzes.length === 0 && !error && (
          <div style={S.emptyState}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🧠</span>
            <h3 style={{ color: '#f1f1f3', marginBottom: 8, fontWeight: 600 }}>No quizzes yet</h3>
            <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>
              {role === 'company' ? 'Create your first quiz to assess students.' : 'Check back later for new quizzes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.9rem', color: '#5a5a66' },
  createBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s ease' },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s ease', overflow: 'hidden', animation: 'fadeIn 0.4s ease forwards', opacity: 0 },
  cardGradientBar: { height: 3, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)', opacity: 0.7 },
  cardBody: { padding: '20px 24px' },
  cardHeader: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 },
  cardTitle: { fontSize: '1.05rem', fontWeight: 600, color: '#f1f1f3', lineHeight: 1.3, marginBottom: 4 },
  cardDesc: { fontSize: '0.8rem', color: '#6b6b78', lineHeight: 1.5 },
  completedBadge: { padding: '4px 10px', borderRadius: 50, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' },
  bannedBadge: { padding: '4px 10px', borderRadius: 50, background: 'rgba(244,63,94,0.12)', color: '#f43f5e', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' },

  cardMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  metaChip: { padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66', border: '1px solid rgba(255,255,255,0.04)' },

  scoreBar: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  scoreLabel: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500, whiteSpace: 'nowrap' },
  scoreFill: { flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  scoreProgress: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  scorePercent: { fontSize: '0.8rem', fontWeight: 700, minWidth: 36, textAlign: 'right' },

  cardFooter: { borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, marginTop: 4 },
  cardAction: { fontSize: '0.8rem', color: '#a78bfa', fontWeight: 500 },
  cardActionBanned: { fontSize: '0.8rem', color: '#f43f5e', fontWeight: 500 },

  emptyState: { textAlign: 'center', padding: '80px 24px' },
};

export default Quizzes;
