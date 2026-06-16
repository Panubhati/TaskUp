import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/assessments`, { headers: { Authorization: `Bearer ${token}` } });
        setAssessments(res.data);
      } catch (err) { setError(err.response?.data?.error || 'Failed to load assessments'); }
      setLoading(false);
    })();
  }, [token, navigate]);

  const fmt = (m) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m} min`;

  if (loading) return (
    <div style={S.loadWrap}><div style={S.spin}></div>
      <p style={{ color: '#5a5a66', marginTop: 16, fontSize: '0.9rem' }}>Loading assessments...</p>
    </div>
  );

  return (
    <div style={S.page}><div style={S.ctr}>
      <div style={S.hdr}>
        <div>
          <div style={S.tag}>{role === 'company' ? 'YOUR ASSESSMENTS' : 'AVAILABLE ASSESSMENTS'}</div>
          <h1 style={S.title}>📝 Assessments</h1>
          <p style={S.sub}>{assessments.length} assessment{assessments.length !== 1 ? 's' : ''} available</p>
        </div>
        {role === 'company' && <button style={S.createBtn} onClick={() => navigate('/assessments/create')}>+ Create Assessment</button>}
      </div>
      {error && <div style={S.err}><span>⚠</span> {error}</div>}
      <div style={S.grid}>
        {assessments.map((a, i) => {
          const done = a.hasAttempted, ban = a.isBanned;
          return (
            <div key={a._id} style={{ ...S.card, animationDelay: `${i*0.06}s` }}
              onClick={() => { if (ban) return; if (role === 'company') { navigate(`/assessments/${a._id}/leaderboard`); } else { window.open(`/assessments/${a._id}`, '_blank'); } }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={S.bar}></div>
              <div style={S.body}>
                <div style={S.cardHdr}>
                  <div style={S.icon}>📝</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={S.cardTitle}>{a.title}</h3>
                    {a.description && <p style={S.desc}>{a.description.substring(0,80)}{a.description.length > 80 ? '...' : ''}</p>}
                  </div>
                  {done && !ban && <div style={S.doneBadge}>✓ Done</div>}
                  {ban && <div style={S.banBadge}>🚫 Banned</div>}
                </div>
                <div style={S.meta}>
                  <span style={S.chip}>📝 {a.totalQuestions || a.questions?.length || 0} questions</span>
                  <span style={S.chip}>⏱ {fmt(a.timeLimitMinutes)}</span>
                  <span style={S.chip}>📹 Proctored</span>
                  {role === 'company' && <><span style={S.chip}>👥 {a.uniqueParticipants || 0}</span><span style={S.chip}>📊 {a.totalSubmissions || 0} subs</span></>}
                  {a.company?.username && role === 'student' && <span style={S.chip}>🏢 {a.company.username}</span>}
                </div>
                {done && a.myPercentage !== undefined && (
                  <div style={S.scoreRow}>
                    <span style={S.scoreLbl}>Your Score</span>
                    <div style={S.scoreFill}><div style={{ ...S.scoreBar2, width: `${a.myPercentage}%`, background: a.myPercentage >= 70 ? '#10b981' : a.myPercentage >= 40 ? '#f59e0b' : '#f43f5e' }}></div></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: a.myPercentage >= 70 ? '#10b981' : a.myPercentage >= 40 ? '#f59e0b' : '#f43f5e' }}>{a.myPercentage}%</span>
                  </div>
                )}
                <div style={S.foot}>
                  <span style={ban ? S.actBan : S.act}>
                    {ban ? '🚫 Banned' : role === 'company' ? 'View Leaderboard →' : done ? 'View Results →' : 'Start Assessment →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {assessments.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>📝</span>
          <h3 style={{ color: '#f1f1f3', marginBottom: 8, fontWeight: 600 }}>No assessments yet</h3>
          <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>{role === 'company' ? 'Create your first assessment.' : 'Check back later.'}</p>
        </div>
      )}
    </div></div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: 'var(--bg-primary, #0a0a0f)' },
  ctr: { maxWidth: 1000, margin: '0 auto' },
  hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #f1f1f3)', letterSpacing: '-0.5px', marginBottom: 6 },
  sub: { fontSize: '0.9rem', color: 'var(--text-muted, #5a5a66)' },
  createBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  err: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  loadWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: 'var(--bg-primary, #0a0a0f)' },
  spin: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s ease', overflow: 'hidden', animation: 'fadeIn 0.4s ease forwards', opacity: 0 },
  bar: { height: 3, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)', opacity: 0.7 },
  body: { padding: '20px 24px' },
  cardHdr: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 },
  icon: { width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 },
  cardTitle: { fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary, #f1f1f3)', lineHeight: 1.3, marginBottom: 4 },
  desc: { fontSize: '0.8rem', color: '#6b6b78', lineHeight: 1.5 },
  doneBadge: { padding: '4px 10px', borderRadius: 50, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 },
  banBadge: { padding: '4px 10px', borderRadius: 50, background: 'rgba(244,63,94,0.12)', color: '#f43f5e', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 },
  meta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  chip: { padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66', border: '1px solid rgba(255,255,255,0.04)' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  scoreLbl: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500, whiteSpace: 'nowrap' },
  scoreFill: { flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  scoreBar2: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  foot: { borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, marginTop: 4 },
  act: { fontSize: '0.8rem', color: '#a78bfa', fontWeight: 500 },
  actBan: { fontSize: '0.8rem', color: '#f43f5e', fontWeight: 500 },
};

export default Assessments;
