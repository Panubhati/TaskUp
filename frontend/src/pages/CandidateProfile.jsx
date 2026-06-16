import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function CandidateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCode, setExpandedCode] = useState(null);
  const [filter, setFilter] = useState('all');
  const [messageModal, setMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';

  useEffect(() => {
    if (!token || role !== 'company') { navigate('/login'); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/candidates/${id}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load candidate profile');
      }
      setLoading(false);
    })();
  }, [id, token, role, navigate]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        receiverId: id,
        content: messageText.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSentSuccess(true);
      setMessageText('');
      setTimeout(() => { setMessageModal(false); setSentSuccess(false); }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    }
    setSending(false);
  };

  const filtered = data?.submissions?.filter(s => filter === 'all' || s.type === filter) || [];
  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  // Theme-aware colors
  const T = {
    bg: isDark ? '#0a0a0f' : '#f5f5f7',
    card: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#f1f1f3' : '#1a1a2e',
    textSec: isDark ? '#94949e' : '#4a4a5a',
    textMuted: isDark ? '#5a5a66' : '#8a8a9a',
    codeBg: isDark ? '#0d0d14' : '#f0f0f4',
    modalBg: isDark ? '#12121a' : '#ffffff',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: T.bg }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ color: T.textMuted, marginTop: 14, fontSize: '0.9rem' }}>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', background: T.bg, padding: '48px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, color: '#ef4444', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  const { candidate, stats } = data;

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: T.bg, padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Back button */}
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: 20, fontFamily: 'inherit', padding: 0 }}>
          ← Back
        </button>

        {/* Profile Header */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 800, flexShrink: 0 }}>
            {candidate.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: T.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              {candidate.username}
            </h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              {candidate.college && (
                <span style={{ fontSize: '0.82rem', color: T.textSec }}>🎓 {candidate.college}</span>
              )}
              {candidate.city && (
                <span style={{ fontSize: '0.82rem', color: T.textSec }}>📍 {candidate.city}</span>
              )}
              {candidate.qualifyingYear && (
                <span style={{ fontSize: '0.82rem', color: T.textSec }}>📅 {candidate.qualifyingYear}</span>
              )}
              {candidate.email && (
                <span style={{ fontSize: '0.82rem', color: T.textSec }}>✉️ {candidate.email}</span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: T.textMuted, marginTop: 6 }}>
              Joined {new Date(candidate.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={() => setMessageModal(true)}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
              transition: 'all 0.2s ease', flexShrink: 0,
            }}
            id="message-candidate-btn"
          >
            💬 Message This Candidate
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { icon: '🏆', val: stats.totalPoints, label: 'Total Points', color: '#10b981' },
            { icon: '📊', val: stats.totalSubmissions, label: 'Submissions', color: '#a78bfa' },
            { icon: '💻', val: stats.taskCount, label: 'Tasks Solved', color: '#06b6d4' },
            { icon: '📋', val: stats.assignmentCount, label: 'Assignments', color: '#a78bfa' },
            { icon: '📝', val: stats.assessmentCount, label: 'Assessments Taken', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, fontFamily: '"SF Mono","Fira Code",monospace' }}>{s.val}</div>
              <div style={{ fontSize: '0.62rem', color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.textMuted, marginRight: 4 }}>Filter:</span>
          {[
            { key: 'all', label: '🔎 All' },
            { key: 'task', label: '💻 Tasks' },
            { key: 'assignment', label: '📋 Assignments' },
            { key: 'assessment', label: '📝 Assessments' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setFilter(opt.key)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
              border: filter === opt.key ? '1px solid rgba(139,92,246,0.25)' : `1px solid ${T.cardBorder}`,
              background: filter === opt.key ? 'rgba(139,92,246,0.1)' : T.card,
              color: filter === opt.key ? '#a78bfa' : T.textMuted,
            }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Submissions */}
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: T.text, marginBottom: 14 }}>
          Submissions ({filtered.length})
        </h3>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14 }}>
            <span style={{ fontSize: '2rem' }}>📭</span>
            <p style={{ color: T.textMuted, fontSize: '0.85rem', marginTop: 10 }}>No submissions found for this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((sub, idx) => {
              const isExpanded = expandedCode === idx;
              return (
                <div key={idx} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: sub.code ? 'pointer' : 'default' }}
                    onClick={() => sub.code && setExpandedCode(isExpanded ? null : idx)}>
                    {/* Type badge */}
                    <span style={{
                      padding: '3px 10px', borderRadius: 50, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                      background: sub.type === 'task' ? 'rgba(6,182,212,0.08)' : sub.type === 'assignment' ? 'rgba(167,139,250,0.08)' : 'rgba(245,158,11,0.08)',
                      color: sub.type === 'task' ? '#06b6d4' : sub.type === 'assignment' ? '#a78bfa' : '#f59e0b',
                    }}>
                      {sub.type}
                    </span>

                    {/* Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.taskTitle || sub.assignmentTitle || sub.quizTitle}
                        {sub.questionTitle && <span style={{ color: T.textMuted, fontWeight: 400 }}> — {sub.questionTitle}</span>}
                      </div>
                    </div>

                    {/* Language */}
                    {sub.language && (
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(124,58,237,0.06)', color: '#a78bfa', fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>
                        {sub.language}
                      </span>
                    )}

                    {/* Score */}
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: scoreColor(sub.score || sub.finalScore || sub.percentage || 0), fontFamily: '"SF Mono","Fira Code",monospace', flexShrink: 0 }}>
                      {sub.finalScore ?? sub.score ?? sub.percentage ?? 0}
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: '0.68rem', color: T.textMuted, flexShrink: 0 }}>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ''}
                    </span>

                    {/* Expand arrow */}
                    {sub.code && (
                      <span style={{ fontSize: '0.7rem', color: T.textMuted, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
                    )}
                  </div>

                  {/* Expanded Code View */}
                  {isExpanded && sub.code && (
                    <div style={{ borderTop: `1px solid ${T.cardBorder}` }}>
                      {/* AI Analysis badges */}
                      {sub.aiAnalysis && (
                        <div style={{ display: 'flex', gap: 12, padding: '10px 18px', flexWrap: 'wrap' }}>
                          {sub.aiAnalysis.timeComplexity && sub.aiAnalysis.timeComplexity !== 'N/A' && (
                            <span style={{ fontSize: '0.7rem', color: '#06b6d4' }}>⏱ Time: {sub.aiAnalysis.timeComplexity}</span>
                          )}
                          {sub.aiAnalysis.spaceComplexity && sub.aiAnalysis.spaceComplexity !== 'N/A' && (
                            <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>💾 Space: {sub.aiAnalysis.spaceComplexity}</span>
                          )}
                          {sub.testCasesPassed !== undefined && (
                            <span style={{ fontSize: '0.7rem', color: '#10b981' }}>✅ {sub.testCasesPassed}/{sub.totalTestCases} test cases</span>
                          )}
                        </div>
                      )}
                      <pre style={{
                        margin: 0, padding: '16px 18px', background: T.codeBg, fontSize: '0.78rem', lineHeight: 1.6,
                        color: T.text, overflowX: 'auto', fontFamily: '"SF Mono","Fira Code","Cascadia Code",monospace',
                        maxHeight: 400, borderRadius: '0 0 12px 12px',
                      }}>
                        {sub.code}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Modal */}
      {messageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!sending) setMessageModal(false); }}>
          <div style={{ background: T.modalBg, borderRadius: 16, padding: '28px 24px', maxWidth: 520, width: '90%', border: `1px solid ${T.cardBorder}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            {sentSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <h3 style={{ color: '#10b981', marginTop: 12, fontSize: '1.1rem', fontWeight: 700 }}>Message Sent!</h3>
                <p style={{ color: T.textMuted, fontSize: '0.85rem', marginTop: 6 }}>Your message has been delivered to {candidate.username}.</p>
              </div>
            ) : (
              <>
                <h3 style={{ color: T.text, fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>💬 Message {candidate.username}</h3>
                <p style={{ color: T.textMuted, fontSize: '0.78rem', margin: '0 0 18px' }}>Send a direct message to this candidate</p>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Write your message here..."
                  maxLength={2000}
                  style={{
                    width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 10,
                    background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                    color: T.text, fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical',
                    outline: 'none', lineHeight: 1.6,
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: '0.68rem', color: T.textMuted }}>{messageText.length}/2000</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setMessageModal(false)} disabled={sending}
                      style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${T.cardBorder}`, background: 'transparent', color: T.textSec, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                    <button onClick={sendMessage} disabled={sending || !messageText.trim()}
                      style={{
                        padding: '8px 22px', borderRadius: 8, border: 'none',
                        background: (!messageText.trim() || sending) ? (isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.15)') : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: (!messageText.trim() || sending) ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', boxShadow: (!messageText.trim() || sending) ? 'none' : '0 2px 10px rgba(139,92,246,0.2)',
                      }}>
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
