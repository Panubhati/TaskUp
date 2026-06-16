import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const CreateQuiz = () => {
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
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.errorBox}><span>🚫</span> Only companies can create quizzes.</div>
        </div>
      </div>
    );
  }

  const addQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!title.trim()) return setError('Quiz title is required');
    if (timeLimitMinutes < 1) return setError('Time limit must be at least 1 minute');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return setError(`Question ${i + 1}: Question text is required`);
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) return setError(`Question ${i + 1}: Option ${j + 1} is required`);
      }
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/quizzes`, {
        title: title.trim(),
        description: description.trim(),
        timeLimitMinutes,
        questions: questions.map(q => ({
          questionText: q.questionText.trim(),
          options: q.options.map(o => o.trim()),
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
        })),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Quiz created successfully!');
      setTimeout(() => navigate('/quizzes'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quiz');
    }
    setSubmitting(false);
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.headerSection}>
          <button style={S.backBtn} onClick={() => navigate('/quizzes')}>← Back</button>
          <div style={S.tag}>CREATE QUIZ</div>
          <h1 style={S.title}>🧠 New Quiz</h1>
          <p style={S.subtitle}>Create an MCQ quiz for students to attempt</p>
        </div>

        {error && <div style={S.errorBox}><span>⚠</span> {error}</div>}
        {success && <div style={S.successBox}><span>✓</span> {success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Quiz Info Card */}
          <div style={S.sectionCard}>
            <h2 style={S.sectionTitle}>Quiz Details</h2>
            <div style={S.fieldGroup}>
              <label style={S.label}>Title *</label>
              <input
                style={S.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. JavaScript Fundamentals Quiz"
                onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Description</label>
              <textarea
                style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the quiz..."
                onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>⏱ Time Limit (minutes) *</label>
              <input
                style={{ ...S.input, maxWidth: 200 }}
                type="number"
                min="1"
                value={timeLimitMinutes}
                onChange={e => setTimeLimitMinutes(parseInt(e.target.value) || 1)}
                onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              />
            </div>
          </div>

          {/* Questions */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={S.sectionTitle}>Questions ({questions.length})</h2>
              <button type="button" style={S.addBtn} onClick={addQuestion}>+ Add Question</button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} style={S.questionCard}>
                <div style={S.qCardHeader}>
                  <div style={S.qNumber}>Q{qIdx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <input
                      style={S.qTextInput}
                      value={q.questionText}
                      onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)}
                      placeholder="Enter your question..."
                      onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                  {questions.length > 1 && (
                    <button type="button" style={S.removeBtn} onClick={() => removeQuestion(qIdx)}>✕</button>
                  )}
                </div>

                <div style={S.optionsGrid}>
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      style={{
                        ...S.optionRow,
                        borderColor: q.correctAnswer === optIdx ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)',
                        background: q.correctAnswer === optIdx ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          ...S.optionSelect,
                          background: q.correctAnswer === optIdx ? '#10b981' : 'rgba(255,255,255,0.06)',
                          color: q.correctAnswer === optIdx ? '#fff' : '#5a5a66',
                          borderColor: q.correctAnswer === optIdx ? '#10b981' : 'rgba(255,255,255,0.1)',
                        }}
                        onClick={() => updateQuestion(qIdx, 'correctAnswer', optIdx)}
                        title="Mark as correct answer"
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </button>
                      <input
                        style={S.optionInput}
                        value={opt}
                        onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        onFocus={e => { e.target.style.color = '#f1f1f3'; }}
                        onBlur={e => { e.target.style.color = '#c4c4cc'; }}
                      />
                      {q.correctAnswer === optIdx && (
                        <span style={S.correctTag}>✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={S.qFooter}>
                  <label style={{ fontSize: '0.75rem', color: '#5a5a66' }}>
                    Points:
                    <input
                      type="number"
                      min="1"
                      style={S.pointsInput}
                      value={q.points}
                      onChange={e => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div style={S.submitSection}>
            <div style={S.summaryChips}>
              <span style={S.summaryChip}>📝 {questions.length} question{questions.length !== 1 ? 's' : ''}</span>
              <span style={S.summaryChip}>⏱ {timeLimitMinutes} min</span>
              <span style={S.summaryChip}>⭐ {questions.reduce((s, q) => s + (q.points || 1), 0)} total points</span>
            </div>
            <button type="submit" style={S.publishBtn} disabled={submitting}>
              {submitting ? '◌ Creating...' : '🚀 Publish Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '800px', margin: '0 auto' },
  headerSection: { marginBottom: 28 },
  backBtn: { background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0, fontWeight: 500 },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.9rem', color: '#5a5a66' },

  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },
  successBox: { padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 20 },

  sectionCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 28px 20px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 20 },
  fieldGroup: { marginBottom: 18 },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#94949e', marginBottom: 8 },
  input: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f1f1f3', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease' },

  addBtn: { padding: '8px 18px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  questionCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px', marginBottom: 16, transition: 'all 0.2s ease' },
  qCardHeader: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 },
  qNumber: { width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 },
  qTextInput: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f1f3', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease', fontWeight: 500 },
  removeBtn: { width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' },

  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  optionRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s ease' },
  optionSelect: { width: 30, height: 30, borderRadius: 8, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.2s ease' },
  optionInput: { flex: 1, background: 'none', border: 'none', color: '#c4c4cc', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' },
  correctTag: { fontSize: '0.65rem', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' },

  qFooter: { display: 'flex', justifyContent: 'flex-end' },
  pointsInput: { width: 50, padding: '4px 8px', marginLeft: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f1f3', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' },

  submitSection: { marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  summaryChips: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  summaryChip: { padding: '6px 14px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', color: '#94949e', fontSize: '0.78rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.06)' },
  publishBtn: { padding: '14px 36px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', letterSpacing: '0.3px' },
};

export default CreateQuiz;
