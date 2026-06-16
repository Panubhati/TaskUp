import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const CreateAssessment = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (role !== 'company') {
    return (<div style={S.page}><div style={S.ctr}><div style={S.err}><span>🚫</span> Only companies can create assessments.</div></div></div>);
  }

  const addQ = () => setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
  const removeQ = (i) => { if (questions.length <= 1) return; setQuestions(questions.filter((_, j) => j !== i)); };
  const updateQ = (i, f, v) => { const u = [...questions]; u[i] = { ...u[i], [f]: v }; setQuestions(u); };
  const updateOpt = (qi, oi, v) => { const u = [...questions]; const o = [...u[qi].options]; o[oi] = v; u[qi] = { ...u[qi], options: o }; setQuestions(u); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!title.trim()) return setError('Title is required');
    if (timeLimitMinutes < 1) return setError('Time limit must be at least 1 minute');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return setError(`Question ${i+1}: text required`);
      for (let j = 0; j < 4; j++) if (!q.options[j].trim()) return setError(`Question ${i+1}: Option ${j+1} required`);
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/assessments`, {
        title: title.trim(), description: description.trim(), timeLimitMinutes,
        questions: questions.map(q => ({ questionText: q.questionText.trim(), options: q.options.map(o => o.trim()), correctAnswer: q.correctAnswer, points: q.points || 1 })),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Assessment created successfully!');
      setTimeout(() => navigate('/assessments'), 1200);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create assessment'); }
    setSubmitting(false);
  };

  return (
    <div style={S.page}><div style={S.ctr}>
      <div style={S.headerSec}>
        <button style={S.back} onClick={() => navigate('/assessments')}>← Back</button>
        <div style={S.tag}>CREATE ASSESSMENT</div>
        <h1 style={S.title}>📝 New Assessment</h1>
        <p style={S.sub}>Create an MCQ assessment for students to attempt</p>
      </div>
      {error && <div style={S.err}><span>⚠</span> {error}</div>}
      {success && <div style={S.suc}><span>✓</span> {success}</div>}
      <form onSubmit={handleSubmit}>
        <div style={S.secCard}>
          <h2 style={S.secTitle}>Assessment Details</h2>
          <div style={S.fg}><label style={S.lbl}>Title *</label>
            <input style={S.inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JavaScript Fundamentals" /></div>
          <div style={S.fg}><label style={S.lbl}>Description</label>
            <textarea style={{ ...S.inp, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." /></div>
          <div style={S.fg}><label style={S.lbl}>⏱ Time Limit (minutes) *</label>
            <input style={{ ...S.inp, maxWidth: 200 }} type="number" min="1" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(parseInt(e.target.value) || 1)} /></div>
        </div>
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={S.secTitle}>Questions ({questions.length})</h2>
            <button type="button" style={S.addBtn} onClick={addQ}>+ Add Question</button>
          </div>
          {questions.map((q, qi) => (
            <div key={qi} style={S.qCard}>
              <div style={S.qHdr}>
                <div style={S.qNum}>Q{qi+1}</div>
                <div style={{ flex: 1 }}><input style={S.qInp} value={q.questionText} onChange={e => updateQ(qi, 'questionText', e.target.value)} placeholder="Enter your question..." /></div>
                {questions.length > 1 && <button type="button" style={S.rmBtn} onClick={() => removeQ(qi)}>✕</button>}
              </div>
              <div style={S.optGrid}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ ...S.optRow, borderColor: q.correctAnswer === oi ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)', background: q.correctAnswer === oi ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)' }}>
                    <button type="button" style={{ ...S.optSel, background: q.correctAnswer === oi ? '#10b981' : 'rgba(255,255,255,0.06)', color: q.correctAnswer === oi ? '#fff' : '#5a5a66' }} onClick={() => updateQ(qi, 'correctAnswer', oi)}>{String.fromCharCode(65+oi)}</button>
                    <input style={S.optInp} value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65+oi)}`} />
                    {q.correctAnswer === oi && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>✓ Correct</span>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <label style={{ fontSize: '0.75rem', color: '#5a5a66' }}>Points: <input type="number" min="1" style={S.ptInp} value={q.points} onChange={e => updateQ(qi, 'points', parseInt(e.target.value) || 1)} /></label>
              </div>
            </div>
          ))}
        </div>
        <div style={S.submitSec}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={S.sumChip}>📝 {questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            <span style={S.sumChip}>⏱ {timeLimitMinutes} min</span>
            <span style={S.sumChip}>⭐ {questions.reduce((s,q) => s+(q.points||1), 0)} pts</span>
          </div>
          <button type="submit" style={S.pubBtn} disabled={submitting}>{submitting ? '◌ Creating...' : '🚀 Publish Assessment'}</button>
        </div>
      </form>
    </div></div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: 'var(--bg-primary, #0a0a0f)' },
  ctr: { maxWidth: 800, margin: '0 auto' },
  headerSec: { marginBottom: 28 },
  back: { background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0, fontWeight: 500 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #f1f1f3)', letterSpacing: '-0.5px', marginBottom: 6 },
  sub: { fontSize: '0.9rem', color: '#5a5a66' },
  err: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  suc: { padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  secCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 28px 20px' },
  secTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #f1f1f3)', marginBottom: 20 },
  fg: { marginBottom: 18 },
  lbl: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#94949e', marginBottom: 8 },
  inp: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f1f1f3', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease' },
  addBtn: { padding: '8px 18px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  qCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 16 },
  qHdr: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 },
  qNum: { width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 },
  qInp: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f1f3', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', fontWeight: 500 },
  rmBtn: { width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' },
  optGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  optRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid', transition: 'all 0.2s ease' },
  optSel: { width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, fontFamily: 'inherit' },
  optInp: { flex: 1, background: 'none', border: 'none', color: '#c4c4cc', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' },
  ptInp: { width: 50, padding: '4px 8px', marginLeft: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f1f3', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' },
  submitSec: { marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  sumChip: { padding: '6px 14px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', color: '#94949e', fontSize: '0.78rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.06)' },
  pubBtn: { padding: '14px 36px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};

export default CreateAssessment;
