import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Login = () => {
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
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('userName', response.data.username || username);
      localStorage.setItem('userStatus', response.data.status || 'approved');
      localStorage.setItem('companyDetailsCompleted', response.data.companyDetailsCompleted || false);

      // If company is approved but hasn't filled details, redirect to details page
      if (response.data.role === 'company' && !response.data.companyDetailsCompleted) {
        window.location.href = '/company-details';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Decorative top bar */}
        <div style={styles.topBar}></div>

        <div style={styles.header}>
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to your TaskUp account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={styles.error}>
              <span style={{ marginRight: '8px' }}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonLoading : {}),
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={styles.spinner}></span>
            ) : null}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Don't have an account? </span>
          <Link to="/signup" style={styles.link}>Create one</Link>
        </div>

        <div style={styles.adminFooter}>
          <Link to="/admin/login" style={styles.adminLink}>
            🛡️ Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 64px)',
    padding: '40px 20px',
    background: '#0a0a0f',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '0',
    overflow: 'hidden',
  },
  topBar: {
    height: '3px',
    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
  },
  header: {
    padding: '40px 36px 0',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#f1f1f3',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#5a5a66',
    fontWeight: '400',
  },
  form: {
    padding: '32px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#f1f1f3',
    fontSize: '0.95rem',
    fontWeight: '400',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(244, 63, 94, 0.08)',
    border: '1px solid rgba(244, 63, 94, 0.15)',
    borderRadius: '10px',
    color: '#f43f5e',
    fontSize: '0.85rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    marginTop: '4px',
  },
  buttonLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
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
  footer: {
    textAlign: 'center',
    padding: '0 36px 32px',
  },
  footerText: {
    color: '#5a5a66',
    fontSize: '0.88rem',
  },
  link: {
    color: '#a78bfa',
    fontWeight: '600',
    fontSize: '0.88rem',
    textDecoration: 'none',
  },
  adminFooter: {
    textAlign: 'center',
    padding: '0 36px 24px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '16px',
  },
  adminLink: {
    color: '#6b6b77',
    fontSize: '0.78rem',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
};

export default Login;