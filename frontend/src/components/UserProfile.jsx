import React from 'react';

const UserProfile = () => {
  const userName = localStorage.getItem('userName') || 'User';
  const userRole = localStorage.getItem('role') || 'Member';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    window.location.href = '/login';
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Gradient top */}
        <div style={styles.cardTop}>
          <div style={styles.avatarWrap}>
            <div style={styles.avatar}>{userInitial}</div>
          </div>
        </div>

        <div style={styles.cardBody}>
          <h1 style={styles.userName}>{userName}</h1>
          <div style={styles.roleBadge}>
            {userRole === 'company' ? '🏢' : '🎓'} {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </div>

          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>—</div>
              <div style={styles.statLabel}>Challenges</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>—</div>
              <div style={styles.statLabel}>Score</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>—</div>
              <div style={styles.statLabel}>Rank</div>
            </div>
          </div>

          {/* Info */}
          <div style={styles.infoSection}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Account type</span>
              <span style={styles.infoValue}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Username</span>
              <span style={styles.infoValue}>{userName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Status</span>
              <span style={{ ...styles.infoValue, color: '#10b981' }}>● Active</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
            }}
          >
            Sign Out
          </button>
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
    maxWidth: '400px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    overflow: 'hidden',
  },
  cardTop: {
    height: '100px',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    bottom: '-36px',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    fontWeight: '700',
    border: '3px solid #0a0a0f',
    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
  },
  cardBody: {
    padding: '48px 28px 28px',
    textAlign: 'center',
  },
  userName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#f1f1f3',
    marginBottom: '8px',
    letterSpacing: '-0.3px',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    borderRadius: '50px',
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#a78bfa',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '24px',
  },
  statItem: {
    padding: '16px 8px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  statValue: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#f1f1f3',
    marginBottom: '2px',
  },
  statLabel: {
    fontSize: '0.68rem',
    color: '#5a5a66',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoSection: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '4px 0',
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  infoLabel: {
    fontSize: '0.82rem',
    color: '#5a5a66',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '0.82rem',
    color: '#f1f1f3',
    fontWeight: '600',
  },
  logoutBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(244, 63, 94, 0.08)',
    color: '#f43f5e',
    border: '1px solid rgba(244, 63, 94, 0.15)',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default UserProfile;