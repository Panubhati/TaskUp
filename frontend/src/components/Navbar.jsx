import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const CustomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [unreadCount, setUnreadCount] = useState(0);

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transition');
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 400);
  };

  // Fetch unread message count
  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(res.data.unreadCount || 0);
    } catch { }
  }, [token]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Re-fetch on navigation (e.g., after reading messages)
  useEffect(() => {
    fetchUnread();
  }, [location.pathname, fetchUnread]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const isDark = theme === 'dark';

  return (
    <nav style={{
      ...styles.navbar,
      background: isDark ? 'rgba(10, 10, 15, 0.8)' : 'rgba(245, 245, 247, 0.85)',
      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
    }}>
      <div style={styles.container}>
        <Link to="/" style={styles.brand}>
          <span style={styles.brandIcon}>⚡</span>
          <span style={styles.brandText}>TaskUp</span>
        </Link>

        <div style={styles.navLinks} className="navbar-links-scroll">
          <Link to="/" style={{
            ...styles.navLink,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
            ...(isActive('/') ? {
              color: isDark ? '#fff' : '#1a1a2e',
              background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
            } : {})
          }}>
            Home
          </Link>

          {role === 'company' && (
            <Link to="/question-bank" style={{
              ...styles.navLink,
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              ...(isActive('/question-bank') ? {
                color: isDark ? '#fff' : '#1a1a2e',
                background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
              } : {})
            }}>
              📚 Questions
            </Link>
          )}

          {role === 'student' && (
            <>
              <Link to="/compete" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/compete') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                Compete
              </Link>
              <Link to="/assignments" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/assignments') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                📋 Assignments
              </Link>
              <Link to="/assessments" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/assessments') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                🧠 Assessments
              </Link>
              <Link to="/leaderboard" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/leaderboard') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                🏆 Leaderboard
              </Link>
              <Link to="/resume-evaluation" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/resume-evaluation') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                AI Resume
              </Link>
            </>
          )}

          {role === 'company' && (
            <>
              <Link to="/company-dashboard" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/company-dashboard') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                📊 Dashboard
              </Link>
              <Link to="/assignments" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/assignments') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                📋 Assignments
              </Link>
              <Link to="/assessments" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/assessments') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                🧠 Assessments
              </Link>
              <Link to="/create" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/create') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                Create Task
              </Link>
              <Link to="/compete" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/compete') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                All Tasks
              </Link>
              <Link to="/leaderboard" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/leaderboard') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                🏆 Leaderboard
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <Link to="/admin" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/admin') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                🛡️ Admin Panel
              </Link>
            </>
          )}
        </div>

        <div style={styles.navRight}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              ...styles.themeBtn,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#f59e0b' : '#6366f1',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="theme-toggle-btn"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Messages Link */}
          {token && (role === 'company' || role === 'student') && (
            <Link to="/messages" style={{
              ...styles.messagesLink,
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              background: isActive('/messages')
                ? (isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)')
                : 'transparent',
            }} id="messages-nav-link">
              💬
              {unreadCount > 0 && (
                <span style={styles.unreadBadge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {token ? (
            <>
              <Link to="/profile" style={{
                ...styles.navLink,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                ...(isActive('/profile') ? {
                  color: isDark ? '#fff' : '#1a1a2e',
                  background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                } : {})
              }}>
                Profile
              </Link>
              <button onClick={handleLogout} style={{
                ...styles.logoutBtn,
                background: isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(225, 29, 72, 0.08)',
                color: isDark ? '#f43f5e' : '#e11d48',
                border: isDark ? '1px solid rgba(244, 63, 94, 0.2)' : '1px solid rgba(225, 29, 72, 0.15)',
              }}>
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" style={styles.signInBtn}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: '0 24px',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    height: '64px',
    gap: '24px',
    overflow: 'hidden',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    flexShrink: 0,
  },
  brandIcon: {
    fontSize: '1.4rem',
    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))',
  },
  brandText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.5px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    minWidth: 0,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  navLink: {
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  signInBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    border: 'none',
  },
  logoutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  themeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    fontSize: '1.05rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  messagesLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    textDecoration: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    fontSize: '1.05rem',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  unreadBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-4px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontSize: '0.58rem',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '50px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '14px',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
  },
};

export default CustomNavbar;
