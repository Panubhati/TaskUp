import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');

  // Selection for assignment creation
  const [selected, setSelected] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignTimeLimit, setAssignTimeLimit] = useState('');
  const [assignMaxSubs, setAssignMaxSubs] = useState('2');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');

  // Create Custom Question modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cqTitle, setCqTitle] = useState('');
  const [cqDesc, setCqDesc] = useState('');
  const [cqDifficulty, setCqDifficulty] = useState('Easy');
  const [cqCategory, setCqCategory] = useState('');
  const [cqTags, setCqTags] = useState('');
  const [cqConstraints, setCqConstraints] = useState('');
  const [cqExamples, setCqExamples] = useState([{ input: '', expectedOutput: '', explanation: '' }]);
  const [cqTestCases, setCqTestCases] = useState([{ input: '', expectedOutput: '' }]);
  const [cqCreating, setCqCreating] = useState(false);
  const [cqError, setCqError] = useState('');

  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCategories();
    fetchQuestions();
  }, []);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line
  }, [difficulty, category, tag]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/questions/categories`);
      setCategories(res.data.categories || []);
      setAllTags(res.data.tags || []);
    } catch { }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (difficulty) params.difficulty = difficulty;
      if (category) params.category = category;
      if (tag) params.tag = tag;
      if (search) params.search = search;
      const res = await axios.get(`${API}/questions`, { params });
      setQuestions(res.data);
    } catch {
      setError('Failed to load questions');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map(q => q._id)));
    }
  };

  const createAssignment = async () => {
    if (!assignTitle.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API}/assignments`, {
        title: assignTitle,
        description: assignDesc,
        questionIds: Array.from(selected),
        deadline: assignDeadline || undefined,
        timeLimitMinutes: assignTimeLimit ? parseInt(assignTimeLimit) : 0,
        maxSubmissions: assignMaxSubs ? parseInt(assignMaxSubs) : 2,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Assignment created successfully!');
      setShowModal(false);
      setSelected(new Set());
      setAssignTitle('');
      setAssignDesc('');
      setTimeout(() => {
        setSuccess('');
        navigate('/assignments');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assignment');
    }
    setCreating(false);
  };

  /* ── Create Custom Question ── */
  const resetCqForm = () => {
    setCqTitle('');
    setCqDesc('');
    setCqDifficulty('Easy');
    setCqCategory('');
    setCqTags('');
    setCqConstraints('');
    setCqExamples([{ input: '', expectedOutput: '', explanation: '' }]);
    setCqTestCases([{ input: '', expectedOutput: '' }]);
    setCqError('');
  };

  const handleCqExampleChange = (index, field, value) => {
    const updated = [...cqExamples];
    updated[index][field] = value;
    setCqExamples(updated);
  };

  const handleCqTestCaseChange = (index, field, value) => {
    const updated = [...cqTestCases];
    updated[index][field] = value;
    setCqTestCases(updated);
  };

  const addCqExample = () => setCqExamples([...cqExamples, { input: '', expectedOutput: '', explanation: '' }]);
  const removeCqExample = (i) => { if (cqExamples.length > 1) setCqExamples(cqExamples.filter((_, idx) => idx !== i)); };
  const addCqTestCase = () => setCqTestCases([...cqTestCases, { input: '', expectedOutput: '' }]);
  const removeCqTestCase = (i) => { if (cqTestCases.length > 1) setCqTestCases(cqTestCases.filter((_, idx) => idx !== i)); };

  const createCustomQuestion = async () => {
    setCqError('');
    if (!cqTitle.trim()) return setCqError('Title is required');
    if (!cqDesc.trim()) return setCqError('Description is required');
    if (!cqCategory.trim()) return setCqError('Category is required');
    if (cqExamples.some(e => !e.input.trim() || !e.expectedOutput.trim())) {
      return setCqError('All examples need input and expected output');
    }
    if (cqTestCases.some(t => !t.input.trim() || !t.expectedOutput.trim())) {
      return setCqError('All test cases need input and expected output');
    }

    setCqCreating(true);
    try {
      await axios.post(`${API}/questions`, {
        title: cqTitle.trim(),
        description: cqDesc.trim(),
        difficulty: cqDifficulty,
        category: cqCategory.trim(),
        tags: cqTags.split(',').map(t => t.trim()).filter(Boolean),
        constraints: cqConstraints.trim(),
        examples: cqExamples,
        testCases: cqTestCases,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Custom question created successfully!');
      setShowCreateModal(false);
      resetCqForm();
      fetchQuestions();
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setCqError(err.response?.data?.error || 'Failed to create question');
    }
    setCqCreating(false);
  };

  const deleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this custom question?')) return;
    try {
      await axios.delete(`${API}/questions/${qId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Question deleted!');
      fetchQuestions();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
      setTimeout(() => setError(''), 3000);
    }
  };

  const diffColor = (d) => d === 'Easy' ? '#10b981' : d === 'Medium' ? '#f59e0b' : '#f43f5e';

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.tag}>QUESTION BANK</div>
            <h1 style={S.title}>Curated Coding Questions</h1>
            <p style={S.subtitle}>{questions.length} questions across {categories.length} categories</p>
          </div>
          <div style={S.headerActions}>
            {role === 'company' && (
              <button style={S.createCustomBtn} onClick={() => { resetCqForm(); setShowCreateModal(true); }}>
                ✏️ Create Custom Question
              </button>
            )}
            {role === 'company' && selected.size > 0 && (
              <button style={S.createBtn} onClick={() => setShowModal(true)}>
                📋 Create Assignment ({selected.size} selected)
              </button>
            )}
          </div>
        </div>

        {/* Success / Error */}
        {success && <div style={S.successBox}><span>✓</span> {success}</div>}
        {error && <div style={S.errorBox}><span>⚠</span> {error}</div>}

        {/* Filters */}
        <div style={S.filters}>
          <form onSubmit={handleSearch} style={S.searchWrap}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..." style={S.searchInput} />
            <button type="submit" style={S.searchBtn}>🔍</button>
          </form>

          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={S.select}>
            <option value="">All Difficulties</option>
            <option value="Easy">🟢 Easy</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Hard">🔴 Hard</option>
          </select>

          <select value={category} onChange={e => setCategory(e.target.value)} style={S.select}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={tag} onChange={e => setTag(e.target.value)} style={S.select}>
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {role === 'company' && (
            <button onClick={selectAll} style={S.selectAllBtn}>
              {selected.size === questions.length ? '✕ Deselect All' : '☑ Select All'}
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div style={S.statsBar}>
          <span style={S.stat}><span style={{ color: '#10b981' }}>●</span> Easy: {questions.filter(q => q.difficulty === 'Easy').length}</span>
          <span style={S.stat}><span style={{ color: '#f59e0b' }}>●</span> Medium: {questions.filter(q => q.difficulty === 'Medium').length}</span>
          <span style={S.stat}><span style={{ color: '#f43f5e' }}>●</span> Hard: {questions.filter(q => q.difficulty === 'Hard').length}</span>
        </div>

        {/* Loading */}
        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner}></div>
            <p style={{ color: '#5a5a66', marginTop: 12 }}>Loading questions...</p>
          </div>
        ) : (
          /* Question Grid */
          <div style={S.grid}>
            {questions.map((q, i) => (
              <div key={q._id} style={{ ...S.card, animationDelay: `${i * 0.03}s`, borderColor: selected.has(q._id) ? '#8b5cf6' : 'rgba(255,255,255,0.06)' }}
                onClick={() => role === 'company' && toggleSelect(q._id)}>
                <div style={S.cardTop}>
                  <div style={S.cardBadges}>
                    <span style={{ ...S.diffBadge, background: `${diffColor(q.difficulty)}15`, color: diffColor(q.difficulty), border: `1px solid ${diffColor(q.difficulty)}30` }}>
                      {q.difficulty}
                    </span>
                    <span style={S.catBadge}>{q.category}</span>
                    {q.isCustom ? (
                      <span style={S.customBadge}>✏️ Custom</span>
                    ) : (
                      <span style={S.sourceBadge}>{q.source}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {role === 'company' && q.isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q._id); }}
                        style={S.deleteBtn}
                        title="Delete custom question"
                      >
                        🗑️
                      </button>
                    )}
                    {role === 'company' && (
                      <div style={{ ...S.checkbox, background: selected.has(q._id) ? '#8b5cf6' : 'transparent', borderColor: selected.has(q._id) ? '#8b5cf6' : 'rgba(255,255,255,0.15)' }}>
                        {selected.has(q._id) && <span style={{ fontSize: '0.7rem', color: '#fff' }}>✓</span>}
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={S.cardTitle}>{q.title}</h3>
                <p style={S.cardDesc}>
                  {q.description.length > 140 ? q.description.substring(0, 140) + '...' : q.description}
                </p>

                <div style={S.cardTags}>
                  {q.tags?.slice(0, 4).map(t => (
                    <span key={t} style={S.tagChip}>{t}</span>
                  ))}
                  {q.tags?.length > 4 && <span style={S.tagChip}>+{q.tags.length - 4}</span>}
                </div>

                <div style={S.cardFooter}>
                  <span style={S.metaItem}>📌 {q.examples?.length || 0} examples</span>
                  {q.constraints && <span style={S.metaItem}>📏 Constraints</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && questions.length === 0 && (
          <div style={S.emptyState}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🔍</span>
            <h3 style={{ color: '#f1f1f3', marginBottom: 8 }}>No questions found</h3>
            <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* ═══════ Create Assignment Modal ═══════ */}
      {showModal && (
        <div style={S.overlay} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Create Assignment</h2>
            <p style={S.modalSub}>{selected.size} questions selected</p>

            <div style={S.field}>
              <label style={S.label}>Assignment Title *</label>
              <input value={assignTitle} onChange={e => setAssignTitle(e.target.value)}
                placeholder="e.g. Frontend Developer Assessment" style={S.modalInput} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Description</label>
              <textarea value={assignDesc} onChange={e => setAssignDesc(e.target.value)}
                placeholder="Brief description of the assessment..." style={S.modalTextarea} rows={3} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Deadline (optional)</label>
              <input type="datetime-local" value={assignDeadline}
                onChange={e => setAssignDeadline(e.target.value)} style={S.modalInput} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ ...S.field, flex: 1 }}>
                <label style={S.label}>⏱ Time Limit (minutes)</label>
                <input type="number" min="0" value={assignTimeLimit}
                  onChange={e => setAssignTimeLimit(e.target.value)}
                  placeholder="0 = no limit" style={S.modalInput} />
              </div>
              <div style={{ ...S.field, flex: 1 }}>
                <label style={S.label}>📝 Max Submissions</label>
                <select value={assignMaxSubs} onChange={e => setAssignMaxSubs(e.target.value)}
                  style={S.modalInput}>
                  <option value="1">1 attempt</option>
                  <option value="2">2 attempts</option>
                  <option value="3">3 attempts</option>
                  <option value="5">5 attempts</option>
                </select>
              </div>
            </div>

            <div style={S.modalActions}>
              <button onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancel</button>
              <button onClick={createAssignment} disabled={creating || !assignTitle.trim()}
                style={{ ...S.confirmBtn, opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create Assignment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Create Custom Question Modal ═══════ */}
      {showCreateModal && (
        <div style={S.overlay} onClick={() => setShowCreateModal(false)}>
          <div style={S.createModal} onClick={e => e.stopPropagation()}>
            <div style={S.createModalHeader}>
              <div>
                <h2 style={S.modalTitle}>✏️ Create Custom Question</h2>
                <p style={S.modalSub}>Add your own coding question to the bank</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={S.closeBtn}>✕</button>
            </div>

            <div style={S.createModalBody}>
              {cqError && <div style={S.cqErrorBox}><span>⚠</span> {cqError}</div>}

              {/* Title */}
              <div style={S.field}>
                <label style={S.label}>Question Title *</label>
                <input value={cqTitle} onChange={e => setCqTitle(e.target.value)}
                  placeholder="e.g. Reverse a Linked List" style={S.modalInput} />
              </div>

              {/* Description */}
              <div style={S.field}>
                <label style={S.label}>Problem Description *</label>
                <textarea value={cqDesc} onChange={e => setCqDesc(e.target.value)}
                  placeholder="Describe the problem clearly. Include what inputs the function receives and what output is expected..."
                  style={S.modalTextarea} rows={5} />
              </div>

              {/* Difficulty + Category */}
              <div style={S.twoCol}>
                <div style={S.field}>
                  <label style={S.label}>Difficulty *</label>
                  <select value={cqDifficulty} onChange={e => setCqDifficulty(e.target.value)} style={S.modalInput}>
                    <option value="Easy">🟢 Easy</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Hard">🔴 Hard</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Category *</label>
                  <input value={cqCategory} onChange={e => setCqCategory(e.target.value)}
                    placeholder="e.g. Arrays, Trees, Strings" style={S.modalInput}
                    list="category-suggestions" />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Tags + Constraints */}
              <div style={S.twoCol}>
                <div style={S.field}>
                  <label style={S.label}>Tags (comma separated)</label>
                  <input value={cqTags} onChange={e => setCqTags(e.target.value)}
                    placeholder="e.g. sorting, two-pointer" style={S.modalInput} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Constraints</label>
                  <input value={cqConstraints} onChange={e => setCqConstraints(e.target.value)}
                    placeholder="e.g. 1 ≤ n ≤ 10^5" style={S.modalInput} />
                </div>
              </div>

              {/* Examples */}
              <div style={S.sectionGroup}>
                <div style={S.sectionHeader}>
                  <span style={S.sectionLabel}>📌 Examples *</span>
                  <button type="button" onClick={addCqExample} style={S.addItemBtn}>+ Add Example</button>
                </div>
                {cqExamples.map((ex, i) => (
                  <div key={i} style={S.itemCard}>
                    <div style={S.itemCardHeader}>
                      <span style={S.itemNum}>Example {i + 1}</span>
                      {cqExamples.length > 1 && (
                        <button onClick={() => removeCqExample(i)} style={S.removeItemBtn}>✕</button>
                      )}
                    </div>
                    <div style={S.itemCardBody}>
                      <div style={S.twoCol}>
                        <div style={S.field}>
                          <label style={S.miniLabel}>Input *</label>
                          <textarea value={ex.input} onChange={e => handleCqExampleChange(i, 'input', e.target.value)}
                            placeholder="e.g. [2, 7, 11, 15]\n9" style={S.smallTextarea} rows={2} />
                        </div>
                        <div style={S.field}>
                          <label style={S.miniLabel}>Expected Output *</label>
                          <textarea value={ex.expectedOutput} onChange={e => handleCqExampleChange(i, 'expectedOutput', e.target.value)}
                            placeholder="e.g. [0, 1]" style={S.smallTextarea} rows={2} />
                        </div>
                      </div>
                      <div style={S.field}>
                        <label style={S.miniLabel}>Explanation (optional)</label>
                        <input value={ex.explanation} onChange={e => handleCqExampleChange(i, 'explanation', e.target.value)}
                          placeholder="Because nums[0] + nums[1] == 9..." style={S.smallInput} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Test Cases */}
              <div style={S.sectionGroup}>
                <div style={S.sectionHeader}>
                  <span style={S.sectionLabel}>🧪 Test Cases * <span style={{ fontWeight: 400, color: '#5a5a66', fontSize: '0.7rem' }}>(hidden from students)</span></span>
                  <button type="button" onClick={addCqTestCase} style={S.addItemBtn}>+ Add Test Case</button>
                </div>
                {cqTestCases.map((tc, i) => (
                  <div key={i} style={S.itemCard}>
                    <div style={S.itemCardHeader}>
                      <span style={S.itemNum}>Test Case {i + 1}</span>
                      {cqTestCases.length > 1 && (
                        <button onClick={() => removeCqTestCase(i)} style={S.removeItemBtn}>✕</button>
                      )}
                    </div>
                    <div style={S.itemCardBody}>
                      <div style={S.twoCol}>
                        <div style={S.field}>
                          <label style={S.miniLabel}>Input *</label>
                          <textarea value={tc.input} onChange={e => handleCqTestCaseChange(i, 'input', e.target.value)}
                            placeholder="stdin input for this test" style={S.smallTextarea} rows={2} />
                        </div>
                        <div style={S.field}>
                          <label style={S.miniLabel}>Expected Output *</label>
                          <textarea value={tc.expectedOutput} onChange={e => handleCqTestCaseChange(i, 'expectedOutput', e.target.value)}
                            placeholder="Expected stdout" style={S.smallTextarea} rows={2} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={S.createModalFooter}>
              <button onClick={() => setShowCreateModal(false)} style={S.cancelBtn}>Cancel</button>
              <button onClick={createCustomQuestion} disabled={cqCreating}
                style={{ ...S.confirmBtn, opacity: cqCreating ? 0.6 : 1 }}>
                {cqCreating ? 'Creating...' : '✏️ Create Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Styles ── */
const S = {
  page: { minHeight: 'calc(100vh - 64px)', padding: '40px 24px', background: '#0a0a0f' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  tag: { display: 'inline-block', padding: '4px 12px', borderRadius: 50, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f1f3', letterSpacing: '-0.5px', marginBottom: 6 },
  subtitle: { fontSize: '0.9rem', color: '#5a5a66' },
  createBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,92,246,0.3)', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  createCustomBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.25)', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s ease' },
  successBox: { padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 16 },
  errorBox: { padding: '12px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, color: '#f43f5e', fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 16 },

  filters: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { display: 'flex', flex: '1 1 250px', minWidth: 200 },
  searchInput: { flex: 1, padding: '10px 14px', borderRadius: '8px 0 0 8px', border: '1px solid rgba(255,255,255,0.08)', borderRight: 'none', background: 'rgba(255,255,255,0.04)', color: '#f1f1f3', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' },
  searchBtn: { padding: '10px 14px', borderRadius: '0 8px 8px 0', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', cursor: 'pointer', fontFamily: 'inherit' },
  select: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#12121a', color: '#f1f1f3', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
  selectAllBtn: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' },

  statsBar: { display: 'flex', gap: 20, marginBottom: 20, padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' },
  stat: { fontSize: '0.8rem', color: '#94949e', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 },

  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.25s ease', animation: 'fadeIn 0.4s ease forwards', opacity: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  diffBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700 },
  catBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' },
  sourceBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 600, background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)' },
  customBadge: { padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s ease' },
  deleteBtn: { width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.06)', color: '#f43f5e', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#f1f1f3', marginBottom: 8, lineHeight: 1.3 },
  cardDesc: { fontSize: '0.82rem', color: '#6b6b78', lineHeight: 1.5, marginBottom: 10 },
  cardTags: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  tagChip: { padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: '#5a5a66', border: '1px solid rgba(255,255,255,0.06)' },
  cardFooter: { display: 'flex', gap: 14 },
  metaItem: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500 },

  emptyState: { textAlign: 'center', padding: '80px 24px' },

  // Shared Modal
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal: { width: '95%', maxWidth: 500, background: '#16161e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  modalTitle: { fontSize: '1.4rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 4 },
  modalSub: { fontSize: '0.85rem', color: '#5a5a66', marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: '0.75rem', fontWeight: 600, color: '#94949e', textTransform: 'uppercase', letterSpacing: 0.3 },
  miniLabel: { fontSize: '0.68rem', fontWeight: 600, color: '#5a5a66', textTransform: 'uppercase', letterSpacing: 0.2 },
  modalInput: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f1f1f3', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' },
  modalTextarea: { padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f1f1f3', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  smallInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#f1f1f3', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' },
  smallTextarea: { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#f1f1f3', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94949e', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  confirmBtn: { flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(139,92,246,0.25)' },

  // Create Question Modal (larger)
  createModal: { width: '95%', maxWidth: 720, maxHeight: '90vh', background: '#16161e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  createModalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 0 24px' },
  createModalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  createModalFooter: { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  closeBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#5a5a66', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  cqErrorBox: { padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 8, color: '#f43f5e', fontSize: '0.82rem', display: 'flex', gap: 8, marginBottom: 16 },

  twoCol: { display: 'flex', gap: 12 },

  sectionGroup: { marginBottom: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: '0.82rem', fontWeight: 700, color: '#f1f1f3' },
  addItemBtn: { padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  itemCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  itemNum: { fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa' },
  removeItemBtn: { width: 22, height: 22, borderRadius: 4, border: 'none', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  itemCardBody: { padding: '12px 14px' },
};

export default QuestionBank;
