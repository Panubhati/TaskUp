import React, { useState } from 'react';
import axios from 'axios';

const ResumeEvaluation = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setFileName(f.name);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setFileName(f.name);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setEvaluation(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/resume/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvaluation(response.data.evaluation);
    } catch (err) {
      setError(err.response?.data?.error || 'Evaluation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#f43f5e';
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return '#10b981';
    if (grade.startsWith('B')) return '#06b6d4';
    if (grade.startsWith('C')) return '#f59e0b';
    return '#f43f5e';
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.tag}>AI POWERED</div>
          <h1 style={styles.title}>Resume Evaluation</h1>
          <p style={styles.subtitle}>
            Upload your resume and get instant AI-powered feedback with detailed scoring across 7 categories.
          </p>
        </div>

        {/* Upload Section */}
        {!evaluation && (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                ...styles.dropZone,
                ...(dragActive ? styles.dropZoneActive : {}),
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                accept=".pdf"
                style={{ display: 'none' }}
              />
              <div style={styles.dropIcon}>{fileName ? '✅' : '📄'}</div>
              <div style={styles.dropTitle}>
                {fileName || 'Drop your resume here'}
              </div>
              <div style={styles.dropSub}>
                {fileName ? 'Click to change file' : 'or click to browse · PDF only · Max 5MB'}
              </div>
            </div>

            {error && (
              <div style={styles.error}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(loading || !file ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
              }}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <span style={styles.spinner}></span>
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Evaluate Resume
                </>
              )}
            </button>
          </form>
        )}

        {/* Results */}
        {evaluation && (
          <div style={styles.results}>
            {/* Score Header */}
            <div style={styles.scoreHeader}>
              <div style={styles.scoreCircle}>
                <div style={{
                  ...styles.scoreValue,
                  color: getScoreColor(evaluation.overallScore),
                }}>
                  {evaluation.overallScore}
                </div>
                <div style={styles.scoreLabel}>out of 100</div>
              </div>
              <div style={styles.gradeInfo}>
                <div style={{
                  ...styles.gradeBadge,
                  background: `${getGradeColor(evaluation.grade)}15`,
                  color: getGradeColor(evaluation.grade),
                  border: `1px solid ${getGradeColor(evaluation.grade)}30`,
                }}>
                  Grade: {evaluation.grade}
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaItem}>📄 {evaluation.pageCount} page{evaluation.pageCount > 1 ? 's' : ''}</span>
                  <span style={styles.metaItem}>📝 {evaluation.wordCount} words</span>
                </div>
              </div>
            </div>

            {/* Section Scores */}
            <div style={styles.sectionGroup}>
              <h3 style={styles.sectionTitle}>
                <span>📊</span> Category Breakdown
              </h3>
              {evaluation.sections.map((section, i) => (
                <div key={i} style={styles.sectionCard}>
                  <div style={styles.sectionCardTop}>
                    <span style={styles.sectionName}>{section.name}</span>
                    <span style={{
                      ...styles.sectionScore,
                      color: getScoreColor((section.score / section.maxScore) * 100),
                    }}>
                      {section.score}/{section.maxScore}
                    </span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${(section.score / section.maxScore) * 100}%`,
                      background: getScoreColor((section.score / section.maxScore) * 100),
                    }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <div style={styles.sectionGroup}>
                <h3 style={styles.sectionTitle}>
                  <span>💪</span> Strengths
                </h3>
                <div style={styles.listCard}>
                  {evaluation.strengths.map((s, i) => (
                    <div key={i} style={styles.listItem}>
                      <span style={styles.checkIcon}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {evaluation.suggestions.length > 0 && (
              <div style={styles.sectionGroup}>
                <h3 style={styles.sectionTitle}>
                  <span>💡</span> Suggestions
                </h3>
                <div style={styles.listCard}>
                  {evaluation.suggestions.map((s, i) => (
                    <div key={i} style={styles.listItem}>
                      <span style={styles.arrowIcon}>→</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Skills */}
            {evaluation.keywords.length > 0 && (
              <div style={styles.sectionGroup}>
                <h3 style={styles.sectionTitle}>
                  <span>🔧</span> Detected Skills
                </h3>
                <div style={styles.skillsWrap}>
                  {evaluation.keywords.map((kw, i) => (
                    <span key={i} style={styles.skillBadge}>{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Another */}
            <button
              onClick={() => {
                setEvaluation(null);
                setFile(null);
                setFileName('');
              }}
              style={styles.resetBtn}
            >
              Evaluate Another Resume
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 64px)',
    padding: '40px 24px',
    background: '#0a0a0f',
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  tag: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '50px',
    background: 'rgba(16,185,129,0.1)',
    color: '#10b981',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '1.5px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#f1f1f3',
    letterSpacing: '-0.5px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#5a5a66',
    lineHeight: '1.6',
  },
  dropZone: {
    border: '2px dashed rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.02)',
  },
  dropZoneActive: {
    borderColor: 'rgba(139,92,246,0.4)',
    background: 'rgba(139,92,246,0.04)',
  },
  dropIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  dropTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#f1f1f3',
    marginBottom: '4px',
  },
  dropSub: {
    fontSize: '0.82rem',
    color: '#5a5a66',
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(244,63,94,0.08)',
    border: '1px solid rgba(244,63,94,0.15)',
    borderRadius: '10px',
    color: '#f43f5e',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  submitBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 20px rgba(139,92,246,0.25)',
    fontFamily: 'inherit',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    animation: 'fadeIn 0.5s ease forwards',
  },
  scoreHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '28px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
  },
  scoreCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)',
    border: '3px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: '2rem',
    fontWeight: '800',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: '0.65rem',
    color: '#5a5a66',
    fontWeight: '500',
    marginTop: '2px',
  },
  gradeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  gradeBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '700',
    width: 'fit-content',
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
  },
  metaItem: {
    fontSize: '0.8rem',
    color: '#5a5a66',
    fontWeight: '500',
  },
  sectionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#f1f1f3',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionCard: {
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '10px',
  },
  sectionCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionName: {
    fontSize: '0.85rem',
    color: '#94949e',
    fontWeight: '500',
  },
  sectionScore: {
    fontSize: '0.85rem',
    fontWeight: '700',
  },
  progressTrack: {
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease',
  },
  listCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontSize: '0.85rem',
    color: '#94949e',
    lineHeight: '1.5',
  },
  checkIcon: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: '0.8rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  arrowIcon: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: '0.8rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  skillsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  skillBadge: {
    padding: '5px 14px',
    borderRadius: '50px',
    background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.15)',
    color: '#a78bfa',
    fontSize: '0.78rem',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  resetBtn: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    color: '#94949e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default ResumeEvaluation;