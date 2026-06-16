import React, { useState } from 'react';
import axios from 'axios';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      if (response.data.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('userName', response.data.username || username);
      window.location.href = '/admin';
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* Animated background elements */}
      <div style={S.bgOrb1} />
      <div style={S.bgOrb2} />

      <div style={S.card}>
        <div style={S.topBar} />

        <div style={S.header}>
          <div style={S.shieldIcon}>🛡️</div>
          <h1 style={S.title}>Admin Portal</h1>
          <p style={S.subtitle}>TaskUp Administration Access</p>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Admin Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              style={S.input} placeholder="Enter admin username" disabled={isLoading} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={S.input} placeholder="Enter admin password" disabled={isLoading} />
          </div>

          {error && (
            <div style={S.error}>
              <span style={{ marginRight: 8 }}>⚠</span>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading}
            style={{ ...S.button, ...(isLoading ? S.buttonLoading : {}) }}>
            {isLoading && <span style={S.spinner} />}
            {isLoading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div style={S.footer}>
          <p style={S.footerText}>
            🔒 This portal is restricted to authorized administrators only.
          </p>
        </div>
      </div>
    </div>
  );
};

const S = {
  page: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', padding: '40px 20px',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1e 50%, #0a0a0f 100%)',
    position: 'relative', overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
    top: '-10%', right: '-5%', animation: 'float 8s ease-in-out infinite',
  },
  bgOrb2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)',
    bottom: '-8%', left: '-5%', animation: 'float 10s ease-in-out infinite reverse',
  },
  card: {
    width: '100%', maxWidth: 420, position: 'relative', zIndex: 10,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.12)',
    borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(239,68,68,0.05)',
  },
  topBar: { height: 3, background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)' },
  header: { padding: '36px 36px 0', textAlign: 'center' },
  shieldIcon: { fontSize: '2.8rem', marginBottom: 8 },
  title: {
    fontSize: '1.6rem', fontWeight: 800, marginBottom: 6,
    background: 'linear-gradient(135deg, #ef4444, #f97316)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    letterSpacing: '-0.5px',
  },
  subtitle: { fontSize: '0.88rem', color: '#5a5a66', margin: 0 },
  form: { padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: '0.78rem', fontWeight: 700, color: '#6b6b77', letterSpacing: '0.4px', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: 10,
    border: '1px solid rgba(239,68,68,0.12)', background: 'rgba(255,255,255,0.04)',
    color: '#f1f1f3', fontSize: '0.95rem', outline: 'none',
    transition: 'all 0.2s ease', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  error: {
    padding: '12px 16px', background: 'rgba(244,63,94,0.08)',
    border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10,
    color: '#f43f5e', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center',
  },
  button: {
    width: '100%', padding: 14,
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', marginTop: 4, transition: 'all 0.25s',
    letterSpacing: '0.3px',
  },
  buttonLoading: { opacity: 0.7, cursor: 'not-allowed' },
  spinner: {
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
  footer: { textAlign: 'center', padding: '0 36px 28px' },
  footerText: { color: '#5a5a66', fontSize: '0.78rem', margin: 0, lineHeight: 1.5 },
};

export default AdminLogin;
