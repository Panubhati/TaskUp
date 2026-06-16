import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";

const CreateTask = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState([{ input: '', expectedOutput: '', explanation: '' }]);
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authorization token is missing.');
      setIsLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/tasks', { title, description, examples, testCases }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Task created successfully!');
      setTimeout(() => navigate("/compete"), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleChange = (index, field, value) => {
    const updated = [...examples];
    updated[index][field] = value;
    setExamples(updated);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const removeExample = (index) => {
    if (examples.length > 1) setExamples(examples.filter((_, i) => i !== index));
  };

  const removeTestCase = (index) => {
    if (testCases.length > 1) setTestCases(testCases.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.tag}>NEW CHALLENGE</div>
          <h1 style={styles.title}>Create a Task</h1>
          <p style={styles.subtitle}>Define a coding challenge with examples and test cases for evaluation.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Two Sum Problem"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Describe the problem statement in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={styles.textarea}
              rows={5}
            />
          </div>

          {/* Examples */}
          <div style={styles.sectionGroup}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <span>📌</span> Examples
              </h3>
              <button type="button" onClick={() => setExamples([...examples, { input: '', expectedOutput: '', explanation: '' }])} style={styles.addBtn}>
                + Add
              </button>
            </div>

            {examples.map((example, index) => (
              <div key={index} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemLabel}>Example {index + 1}</span>
                  {examples.length > 1 && (
                    <button type="button" onClick={() => removeExample(index)} style={styles.removeBtn}>✕</button>
                  )}
                </div>
                <div style={styles.itemBody}>
                  <input
                    type="text"
                    placeholder="Input"
                    value={example.input}
                    onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                    required
                    style={styles.inputSmall}
                  />
                  <input
                    type="text"
                    placeholder="Expected Output"
                    value={example.expectedOutput}
                    onChange={(e) => handleExampleChange(index, 'expectedOutput', e.target.value)}
                    required
                    style={styles.inputSmall}
                  />
                  <input
                    type="text"
                    placeholder="Explanation (optional)"
                    value={example.explanation}
                    onChange={(e) => handleExampleChange(index, 'explanation', e.target.value)}
                    style={styles.inputSmall}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Test Cases */}
          <div style={styles.sectionGroup}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <span>🧪</span> Test Cases
              </h3>
              <button type="button" onClick={() => setTestCases([...testCases, { input: '', expectedOutput: '' }])} style={styles.addBtn}>
                + Add
              </button>
            </div>

            {testCases.map((testCase, index) => (
              <div key={index} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemLabel}>Test Case {index + 1}</span>
                  {testCases.length > 1 && (
                    <button type="button" onClick={() => removeTestCase(index)} style={styles.removeBtn}>✕</button>
                  )}
                </div>
                <div style={styles.itemBody}>
                  <input
                    type="text"
                    placeholder="Input"
                    value={testCase.input}
                    onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                    required
                    style={styles.inputSmall}
                  />
                  <input
                    type="text"
                    placeholder="Expected Output"
                    value={testCase.expectedOutput}
                    onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                    required
                    style={styles.inputSmall}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div style={styles.error}>
              <span>⚠</span> {error}
            </div>
          )}
          {success && (
            <div style={styles.success}>
              <span>✓</span> {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              ...(isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Task'}
            {!isLoading && <span>→</span>}
          </button>
        </form>
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
    maxWidth: '700px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '36px',
  },
  tag: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '50px',
    background: 'rgba(6,182,212,0.1)',
    color: '#06b6d4',
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
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94949e',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f1f1f3',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f1f1f3',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
  },
  sectionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#f1f1f3',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  addBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(139,92,246,0.3)',
    background: 'rgba(139,92,246,0.08)',
    color: '#a78bfa',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  itemCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  itemLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#a78bfa',
    letterSpacing: '0.3px',
  },
  removeBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(244,63,94,0.1)',
    color: '#f43f5e',
    fontSize: '0.7rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  itemBody: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  inputSmall: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
    color: '#f1f1f3',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
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
  },
  success: {
    padding: '12px 16px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.15)',
    borderRadius: '10px',
    color: '#10b981',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
};

export default CreateTask;