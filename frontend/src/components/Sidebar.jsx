import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null);

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

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => { fetchUnread(); }, [location.pathname, fetchUnread]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const isDark = theme === 'dark';

  // Navigation items per role
  const studentLinks = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/compete', icon: '⚔️', label: 'Compete' },
    { path: '/assignments', icon: '📋', label: 'Assignments' },
    { path: '/assessments', icon: '🧠', label: 'Assessments' },
    { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { path: '/resume-evaluation', icon: '📄', label: 'AI Resume' },
  ];

  const companyLinks = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/company-dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/question-bank', icon: '📚', label: 'Questions' },
    { path: '/assignments', icon: '📋', label: 'Assignments' },
    { path: '/assessments', icon: '🧠', label: 'Assessments' },
    { path: '/create', icon: '➕', label: 'Create Task' },
    { path: '/compete', icon: '📁', label: 'All Tasks' },
    { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  ];

  const navLinks = role === 'company' ? companyLinks : studentLinks;

  const bottomLinks = [
    { path: '/messages', icon: '💬', label: 'Messages', badge: unreadCount },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  const sidebarWidth = collapsed ? 72 : 250;

  return (
    <aside
      className="sidebar-nav"
      style={{
        ...styles.sidebar,
        width: sidebarWidth,
        background: isDark
          ? 'linear-gradient(180deg, #0c0c14 0%, #0a0a0f 100%)'
          : 'linear-gradient(180deg, #f8f8fa 0%, #f0f0f4 100%)',
        borderRight: isDark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* ── Brand + Toggle ── */}
      <div style={styles.topSection}>
        <div style={{ ...styles.brandRow, justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <Link to="/" style={styles.brand}>
              <span style={styles.brandIcon}>⚡</span>
              <span style={styles.brandText}>TaskUp</span>
            </Link>
          )}
          <button
            onClick={onToggle}
            style={{
              ...styles.toggleBtn,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#a0a0b0' : '#5a5a6a',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            id="sidebar-toggle-btn"
          >
            {collapsed ? '☰' : '✕'}
          </button>
        </div>
      </div>

      {/* ── Main Nav Links ── */}
      <nav style={styles.navSection}>
        {!collapsed && (
          <div style={{
            ...styles.sectionLabel,
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
          }}>
            NAVIGATION
          </div>
        )}
        {navLinks.map((link, i) => {
          const active = isActive(link.path);
          const hovered = hoveredItem === `nav-${i}`;
          return (
            <Link
              key={link.path + i}
              to={link.path}
              style={{
                ...styles.navItem,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px 0' : '10px 14px',
                background: active
                  ? (isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.1)')
                  : hovered
                    ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                    : 'transparent',
                color: active
                  ? (isDark ? '#c4b5fd' : '#7c3aed')
                  : (isDark ? '#8a8a9a' : '#5a5a6a'),
                borderLeft: active
                  ? '3px solid #8b5cf6'
                  : '3px solid transparent',
              }}
              onMouseEnter={() => setHoveredItem(`nav-${i}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={collapsed ? link.label : ''}
            >
              <span style={styles.navIcon}>{link.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div style={styles.bottomSection}>
        {!collapsed && (
          <div style={{
            ...styles.sectionLabel,
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
          }}>
            ACCOUNT
          </div>
        )}

        {bottomLinks.map((link, i) => {
          const active = isActive(link.path);
          const hovered = hoveredItem === `bottom-${i}`;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                ...styles.navItem,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px 0' : '10px 14px',
                background: active
                  ? (isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.1)')
                  : hovered
                    ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                    : 'transparent',
                color: active
                  ? (isDark ? '#c4b5fd' : '#7c3aed')
                  : (isDark ? '#8a8a9a' : '#5a5a6a'),
                borderLeft: active ? '3px solid #8b5cf6' : '3px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredItem(`bottom-${i}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={collapsed ? link.label : ''}
            >
              <span style={styles.navIcon}>{link.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{link.label}</span>}
              {link.badge > 0 && (
                <span style={{
                  ...styles.badge,
                  right: collapsed ? 14 : 12,
                  top: collapsed ? 6 : 6,
                }}>
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            ...styles.navItem,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '12px 0' : '10px 14px',
            background: hoveredItem === 'theme'
              ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
              : 'transparent',
            color: isDark ? '#f59e0b' : '#6366f1',
            border: 'none',
            borderLeft: '3px solid transparent',
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'inherit',
          }}
          onMouseEnter={() => setHoveredItem('theme')}
          onMouseLeave={() => setHoveredItem(null)}
          title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''}
          id="sidebar-theme-toggle"
        >
          <span style={styles.navIcon}>{isDark ? '☀️' : '🌙'}</span>
          {!collapsed && <span style={styles.navLabel}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Logout */}
        {token && (
          <button
            onClick={handleLogout}
            style={{
              ...styles.navItem,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '12px 0' : '10px 14px',
              background: hoveredItem === 'logout'
                ? (isDark ? 'rgba(244,63,94,0.08)' : 'rgba(225,29,72,0.06)')
                : 'transparent',
              color: isDark ? '#f43f5e' : '#e11d48',
              border: 'none',
              borderLeft: '3px solid transparent',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit',
            }}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            title={collapsed ? 'Sign Out' : ''}
            id="sidebar-logout-btn"
          >
            <span style={styles.navIcon}>🚪</span>
            {!collapsed && <span style={styles.navLabel}>Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1100,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
  },
  topSection: {
    padding: '16px 12px 8px',
    flexShrink: 0,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    flexShrink: 0,
  },
  brandIcon: {
    fontSize: '1.3rem',
    filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5))',
  },
  brandText: {
    fontSize: '1.15rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  navSection: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  sectionLabel: {
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: 1.5,
    padding: '12px 14px 6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    fontSize: '0.85rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    position: 'relative',
  },
  navIcon: {
    fontSize: '1.1rem',
    flexShrink: 0,
    width: 24,
    textAlign: 'center',
    lineHeight: 1,
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  },
  badge: {
    position: 'absolute',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontSize: '0.55rem',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 50,
    minWidth: 16,
    textAlign: 'center',
    lineHeight: '14px',
    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
  },
  bottomSection: {
    padding: '8px 8px 16px',
    flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
};

export default Sidebar;
