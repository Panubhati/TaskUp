import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api/leaderboard';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const [sortBy, setSortBy] = useState('totalPoints');
  const role = localStorage.getItem('role');
  const isCompany = role === 'company';
  const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setMyId(payload.id);
    } catch {}

    (async () => {
      try {
        const res = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data.leaderboard || []);
      } catch {}
      setLoading(false);
    })();
  }, [navigate]);

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'totalPoints') return b.totalPoints - a.totalPoints;
    if (sortBy === 'taskPoints') return b.taskPoints - a.taskPoints;
    if (sortBy === 'assignmentPoints') return b.assignmentPoints - a.assignmentPoints;
    if (sortBy === 'assessmentPoints') return b.assessmentPoints - a.assessmentPoints;
    return 0;
  });

  const rankMedal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  // Theme-aware colors
  const T = {
    bg: isDark ? '#0a0a0f' : '#f5f5f7',
    card: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    cardBorder: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#f1f1f3' : '#1a1a2e',
    textSec: isDark ? '#94949e' : '#4a4a5a',
    textMuted: isDark ? '#5a5a66' : '#8a8a9a',
    headerBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)',
    rowBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    rowHover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    meBg: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(124,58,237,0.05)',
    meBorder: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.15)',
    top3Bg: isDark ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.04)',
    top3Border: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.12)',
    miniCard: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    miniCardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    sortBtn: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)',
    sortBtnBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: T.bg }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div>
        <p style={{ color: T.textMuted, marginTop: 14, fontSize: '0.9rem' }}>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: T.bg, padding: '32px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.5px' }}>🏆 Global Leaderboard</h1>
            <p style={{ fontSize: '0.88rem', color: T.textMuted, marginTop: '6px', margin: 0 }}>
              Total points earned across tasks, assignments & assessments
              {isCompany && <span style={{ color: '#8b5cf6', fontWeight: 500 }}> — Click a student to view profile</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ padding: '12px 20px', background: T.miniCard, border: `1px solid ${T.miniCardBorder}`, borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a78bfa', fontFamily: '"SF Mono","Fira Code",monospace' }}>{data.length}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', marginTop: '2px' }}>Students</div>
            </div>
            {data.length > 0 && (
              <div style={{ padding: '12px 20px', background: T.miniCard, border: `1px solid ${T.miniCardBorder}`, borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', fontFamily: '"SF Mono","Fira Code",monospace' }}>{sorted[0]?.totalPoints}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', marginTop: '2px' }}>Top Score</div>
              </div>
            )}
          </div>
        </div>

        {/* Sort row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.textMuted, marginRight: '4px' }}>Sort by:</span>
          {[
            { key: 'totalPoints', label: '🏆 Total Points' },
            { key: 'taskPoints', label: '💻 Tasks' },
            { key: 'assignmentPoints', label: '📋 Assignments' },
            { key: 'assessmentPoints', label: '📝 Assessments' },
          ].map(opt => (
            <button key={opt.key} style={{
              padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
              border: sortBy === opt.key ? '1px solid rgba(139,92,246,0.25)' : `1px solid ${T.sortBtnBorder}`,
              background: sortBy === opt.key ? 'rgba(139,92,246,0.1)' : T.sortBtn,
              color: sortBy === opt.key ? '#a78bfa' : T.textMuted,
            }} onClick={() => setSortBy(opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: isCompany ? '55px 1fr 100px 90px 90px 90px 70px' : '55px 1fr 100px 90px 90px 90px', gap: '8px', padding: '10px 16px', background: T.headerBg, borderRadius: '10px', marginBottom: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Rank</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase' }}>Student</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Total Pts</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>💻 Tasks</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>📋 Assign.</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>📝 Assess.</span>
          {isCompany && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}></span>}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <span style={{ fontSize: '2.5rem' }}>📭</span>
            <h3 style={{ color: T.text, marginTop: 12, fontSize: '1rem' }}>No rankings yet</h3>
            <p style={{ color: T.textMuted, fontSize: '0.85rem' }}>Complete activities to appear on the leaderboard.</p>
          </div>
        ) : (
          sorted.map((entry, idx) => {
            const rank = idx + 1;
            const isMe = entry._id === myId;
            const isTop3 = rank <= 3;

            return (
              <div
                key={entry._id}
                onClick={() => isCompany && navigate(`/candidate/${entry._id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isCompany ? '55px 1fr 100px 90px 90px 90px 70px' : '55px 1fr 100px 90px 90px 90px',
                  gap: '8px', padding: '14px 16px',
                  background: isMe ? T.meBg : isTop3 ? T.top3Bg : T.rowBg,
                  border: `1px solid ${isMe ? T.meBorder : isTop3 ? T.top3Border : T.cardBorder}`,
                  borderRadius: '10px', marginBottom: '4px', alignItems: 'center',
                  transition: 'all 0.15s ease',
                  cursor: isCompany ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (isCompany) e.currentTarget.style.background = T.rowHover; }}
                onMouseLeave={e => { if (isCompany) e.currentTarget.style.background = isMe ? T.meBg : isTop3 ? T.top3Bg : T.rowBg; }}
              >
                {/* Rank */}
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>
                  <span style={{ fontSize: isTop3 ? '1.2rem' : '0.88rem', fontWeight: 800, color: T.text, fontFamily: '"SF Mono","Fira Code",monospace' }}>
                    {rankMedal(rank)}
                  </span>
                </div>

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {entry.username}
                      {isMe && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.58rem', fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>YOU</span>}
                    </div>
                    {entry.college && <div style={{ fontSize: '0.72rem', color: T.textMuted, marginTop: '1px' }}>{entry.college}</div>}
                  </div>
                </div>

                {/* Total points */}
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', fontFamily: '"SF Mono","Fira Code",monospace' }}>{entry.totalPoints}</span>
                  <span style={{ fontSize: '0.65rem', color: T.textMuted, fontWeight: 600, marginLeft: '3px' }}>pts</span>
                </div>

                {/* Tasks */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#06b6d4', fontFamily: '"SF Mono","Fira Code",monospace' }}>{entry.taskPoints}</div>
                  <div style={{ fontSize: '0.62rem', color: T.textMuted, marginTop: '2px' }}>{entry.taskCount} solved</div>
                </div>

                {/* Assignments */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#a78bfa', fontFamily: '"SF Mono","Fira Code",monospace' }}>{entry.assignmentPoints}</div>
                  <div style={{ fontSize: '0.62rem', color: T.textMuted, marginTop: '2px' }}>{entry.assignmentCount} done</div>
                </div>

                {/* Assessments */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b', fontFamily: '"SF Mono","Fira Code",monospace' }}>{entry.assessmentPoints}</div>
                  <div style={{ fontSize: '0.62rem', color: T.textMuted, marginTop: '2px' }}>{entry.assessmentCount} taken</div>
                </div>

                {/* View Profile button for companies */}
                {isCompany && (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8b5cf6' }}>View →</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
