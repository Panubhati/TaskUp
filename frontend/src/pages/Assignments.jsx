import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAssignments();
    // eslint-disable-next-line
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assignments');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: 16, fontSize: '0.9rem' }}>Loading assignments...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <div>
            <div style={S.tag}>{role === 'company' ? 'YOUR ASSESSMENTS' : 'AVAILABLE ASSESSMENTS'}</div>
            <h1 style={S.title}>Assignments</h1>
            <p style={S.subtitle}>{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} available</p>
          </div>
          {role === 'company' && (
            <button style={S.createBtn} onClick={() => navigate('/question-bank')}>
              + Create from Question Bank
            </button>
          )}
        </div>

        {error && <div style={S.errorBox}><span>⚠</span> {error}</div>}

        <div style={S.list}>
          {assignments.map((a, i) => {
            const totalQ = a.questions?.length || 0;
            const uniqueUsers = new Set(a.submissions?.map(s => s.user?.toString())).size;
            const isExpired = a.deadline && new Date(a.deadline) < new Date();

            return (
              <div key={a._id} style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
                onClick={() => navigate(`/assignments/${a._id}`)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

                <div style={S.cardAccent}></div>
                <div style={S.cardBody}>
                  <div style={S.cardTop}>
                    <div style={{ flex: 1 }}>
                      <h3 style={S.cardTitle}>{a.title}</h3>
                      {a.description && <p style={S.cardDesc}>{a.description.substring(0, 100)}{a.description.length > 100 ? '...' : ''}</p>}
                    </div>
                    <span style={S.arrow}>→</span>
                  </div>

                  <div style={S.cardMeta}>
                    <span style={S.metaChip}>📋 {totalQ} questions</span>
                    <span style={S.metaChip}>👥 {uniqueUsers} participants</span>
                    <span style={S.metaChip}>📝 {a.submissions?.length || 0} submissions</span>
                    {a.company?.username && <span style={S.metaChip}>🏢 {a.company.username}</span>}
                    {a.deadline && (
                      <span style={{ ...S.metaChip, color: isExpired ? '#f43f5e' : '#f59e0b', background: isExpired ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)' }}>
                        ⏰ {isExpired ? 'Expired' : new Date(a.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Question previews */}
                  <div style={S.questionPreviews}>
                    {a.questions?.slice(0, 3).map(q => (
                      <span key={q._id} style={S.qPreview}>
                        <span style={{ ...S.qDot, background: q.difficulty === 'Easy' ? '#10b981' : q.difficulty === 'Medium' ? '#f59e0b' : '#f43f5e' }}></span>
                        {q.title}
                      </span>
                    ))}
                    {totalQ > 3 && <span style={S.qMore}>+{totalQ - 3} more</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {assignments.length === 0 && !error && (
          <div style={S.emptyState}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>📋</span>
            <h3 style={{ color: '#f1f1f3', marginBottom: 8, fontWeight: 600 }}>No assignments yet</h3>
            <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>
              {role === 'company' ? 'Create your first assessment from the Question Bank.' : 'Check back later for new assignments.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.9rem', color: '#5a5a66' },
  createBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#0a0a0f' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  list: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: { display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s ease', overflow: 'hidden', animation: 'fadeIn 0.4s ease forwards', opacity: 0 },
  cardAccent: { width: 4, background: 'linear-gradient(180deg, #8b5cf6, #06b6d4)', flexShrink: 0 },
  cardBody: { padding: '20px 24px', flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#f1f1f3', lineHeight: 1.3, marginBottom: 4 },
  cardDesc: { fontSize: '0.82rem', color: '#6b6b78', lineHeight: 1.5 },
  arrow: { color: '#5a5a66', fontSize: '1.1rem', flexShrink: 0, marginLeft: 12 },

  cardMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  metaChip: { padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66', border: '1px solid rgba(255,255,255,0.04)' },

  questionPreviews: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  qPreview: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#94949e', fontWeight: 500 },
  qDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  qMore: { fontSize: '0.72rem', color: '#5a5a66', fontStyle: 'italic' },

  emptyState: { textAlign: 'center', padding: '80px 24px' },
};

export default Assignments;
