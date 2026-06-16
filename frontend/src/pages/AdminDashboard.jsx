import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api/admin';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tab, setTab] = useState('pending');
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') navigate('/admin/login');
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, companiesRes, usersRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/companies`, { headers }),
        axios.get(`${API}/users?role=${userFilter}`, { headers }),
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
      setAllUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await axios.put(`${API}/companies/${id}/approve`, {}, { headers });
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await axios.put(`${API}/companies/${id}/reject`, {}, { headers });
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API}/users/${id}`, { headers });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const pendingCompanies = companies.filter(c => c.status === 'pending');
  const approvedCompanies = companies.filter(c => c.status === 'approved');
  const rejectedCompanies = companies.filter(c => c.status === 'rejected');

  const filteredCompanies = tab === 'pending' ? pendingCompanies :
    tab === 'approved' ? approvedCompanies : rejectedCompanies;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  if (loading && !stats) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={S.loadingSpinner} />
          <p style={{ color: '#5a5a66', marginTop: 16 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Background orbs */}
      <div style={S.bgOrb1} />
      <div style={S.bgOrb2} />

      <div style={S.container}>
        {/* Header */}
        <div style={S.headerRow}>
          <div>
            <h1 style={S.pageTitle}>🛡️ Admin Dashboard</h1>
            <p style={S.pageSubtitle}>Manage users, approve companies, and oversee the platform</p>
          </div>
          <button onClick={() => {
            localStorage.clear();
            navigate('/admin/login');
          }} style={S.logoutBtn}>Sign Out</button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={S.statsGrid}>
            <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="#8b5cf6" />
            <StatCard icon="🎓" label="Students" value={stats.totalStudents} color="#06b6d4" />
            <StatCard icon="🏢" label="Companies" value={stats.totalCompanies} color="#10b981" />
            <StatCard icon="⏳" label="Pending" value={stats.pendingCompanies} color="#f59e0b" />
            <StatCard icon="✅" label="Approved" value={stats.approvedCompanies} color="#22c55e" />
            <StatCard icon="❌" label="Rejected" value={stats.rejectedCompanies} color="#ef4444" />
          </div>
        )}

        {/* Company Management Section */}
        <div style={S.section}>
          <h2 style={S.sectionTitle}>🏢 Company Management</h2>

          <div style={S.tabGroup}>
            {[
              { key: 'pending', label: `Pending (${pendingCompanies.length})`, color: '#f59e0b' },
              { key: 'approved', label: `Approved (${approvedCompanies.length})`, color: '#22c55e' },
              { key: 'rejected', label: `Rejected (${rejectedCompanies.length})`, color: '#ef4444' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  ...S.tabBtn,
                  ...(tab === t.key ? { ...S.tabBtnActive, borderColor: t.color, color: t.color } : {}),
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {filteredCompanies.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: '2rem' }}>{tab === 'pending' ? '🎉' : '📭'}</span>
              <p style={{ color: '#5a5a66', margin: '8px 0 0' }}>
                {tab === 'pending' ? 'No pending requests!' : `No ${tab} companies.`}
              </p>
            </div>
          ) : (
            <div style={S.table}>
              <div style={S.tableHeader}>
                <span style={{ ...S.th, flex: 1.5 }}>Username</span>
                <span style={{ ...S.th, flex: 1.5 }}>Company Name</span>
                <span style={{ ...S.th, flex: 2 }}>Email</span>
                <span style={{ ...S.th, flex: 1 }}>City</span>
                <span style={{ ...S.th, flex: 1.2 }}>Registered</span>
                <span style={{ ...S.th, flex: 1 }}>Status</span>
                <span style={{ ...S.th, flex: 2, textAlign: 'right' }}>Actions</span>
              </div>
              {filteredCompanies.map(c => (
                <div key={c._id} style={S.tableRow}>
                  <span style={{ ...S.td, flex: 1.5, fontWeight: 600, color: '#e2e2ea' }}>
                    {c.username}
                  </span>
                  <span style={{ ...S.td, flex: 1.5, color: '#94949e' }}>
                    {c.companyName || '—'}
                  </span>
                  <span style={{ ...S.td, flex: 2, color: '#94949e', fontSize: '0.82rem' }}>
                    {c.email || '—'}
                  </span>
                  <span style={{ ...S.td, flex: 1, color: '#6b6b77', fontSize: '0.82rem' }}>
                    {c.city || '—'}
                  </span>
                  <span style={{ ...S.td, flex: 1.2, color: '#6b6b77', fontSize: '0.82rem' }}>
                    {fmtDate(c.createdAt)}
                  </span>
                  <span style={{ ...S.td, flex: 1 }}>
                    <span style={{
                      ...S.badge,
                      background: c.status === 'pending' ? 'rgba(245,158,11,0.1)' :
                        c.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: c.status === 'pending' ? '#f59e0b' :
                        c.status === 'approved' ? '#22c55e' : '#ef4444',
                      borderColor: c.status === 'pending' ? 'rgba(245,158,11,0.2)' :
                        c.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    }}>
                      {c.status}
                    </span>
                  </span>
                  <span style={{ ...S.td, flex: 2, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {c.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(c._id)}
                          disabled={actionLoading === c._id}
                          style={S.approveBtn}>✓ Approve</button>
                        <button onClick={() => handleReject(c._id)}
                          disabled={actionLoading === c._id}
                          style={S.rejectBtn}>✗ Reject</button>
                      </>
                    )}
                    {c.status === 'rejected' && (
                      <button onClick={() => handleApprove(c._id)}
                        disabled={actionLoading === c._id}
                        style={S.approveBtn}>✓ Approve</button>
                    )}
                    {c.status === 'approved' && (
                      <button onClick={() => handleReject(c._id)}
                        disabled={actionLoading === c._id}
                        style={S.rejectBtn}>✗ Revoke</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Users Section */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={S.sectionTitle}>👥 All Users</h2>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
              style={S.filterSelect}>
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="company">Companies</option>
            </select>
          </div>

          {allUsers.length === 0 ? (
            <div style={S.emptyState}>
              <p style={{ color: '#5a5a66', margin: 0 }}>No users found.</p>
            </div>
          ) : (
            <div style={S.table}>
              <div style={S.tableHeader}>
                <span style={{ ...S.th, flex: 2 }}>Username</span>
                <span style={{ ...S.th, flex: 1.5 }}>Role</span>
                <span style={{ ...S.th, flex: 2 }}>Email / Company</span>
                <span style={{ ...S.th, flex: 1.5 }}>Joined</span>
                <span style={{ ...S.th, flex: 1, textAlign: 'right' }}>Action</span>
              </div>
              {allUsers.map(u => (
                <div key={u._id} style={S.tableRow}>
                  <span style={{ ...S.td, flex: 2, fontWeight: 600, color: '#e2e2ea' }}>
                    {u.username}
                  </span>
                  <span style={{ ...S.td, flex: 1.5 }}>
                    <span style={{
                      ...S.badge,
                      background: u.role === 'student' ? 'rgba(6,182,212,0.1)' : 'rgba(16,185,129,0.1)',
                      color: u.role === 'student' ? '#06b6d4' : '#10b981',
                      borderColor: u.role === 'student' ? 'rgba(6,182,212,0.2)' : 'rgba(16,185,129,0.2)',
                    }}>
                      {u.role === 'student' ? '🎓' : '🏢'} {u.role}
                    </span>
                  </span>
                  <span style={{ ...S.td, flex: 2, color: '#94949e', fontSize: '0.82rem' }}>
                    {u.role === 'student' ? (u.email || '—') : (u.companyName || '—')}
                  </span>
                  <span style={{ ...S.td, flex: 1.5, color: '#6b6b77', fontSize: '0.82rem' }}>
                    {fmtDate(u.createdAt)}
                  </span>
                  <span style={{ ...S.td, flex: 1, textAlign: 'right' }}>
                    <button onClick={() => handleDelete(u._id)} style={S.deleteBtn}>🗑️</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    ...S.statCard,
    borderColor: `${color}18`,
    boxShadow: `0 4px 20px ${color}08`,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ ...S.statValue, color }}>{value}</span>
    </div>
    <span style={S.statLabel}>{label}</span>
  </div>
);

const S = {
  page: {
    minHeight: '100vh', background: '#0a0a0f', position: 'relative', overflow: 'hidden',
  },
  bgOrb1: {
    position: 'fixed', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)',
    top: '-10%', right: '-5%', pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'fixed', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(249,115,22,0.03) 0%, transparent 70%)',
    bottom: '-8%', left: '-5%', pointerEvents: 'none',
  },
  container: {
    maxWidth: 1200, margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 10,
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32,
  },
  pageTitle: {
    fontSize: '1.8rem', fontWeight: 800, color: '#f1f1f3', marginBottom: 6, letterSpacing: '-0.5px',
  },
  pageSubtitle: { fontSize: '0.9rem', color: '#5a5a66', margin: 0 },
  logoutBtn: {
    padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, color: '#ef4444', fontSize: '0.88rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 16, marginBottom: 32,
  },
  statCard: {
    padding: '20px', borderRadius: 16,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  statValue: { fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px' },
  statLabel: { fontSize: '0.78rem', color: '#6b6b77', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },

  section: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '24px', marginBottom: 28,
  },
  sectionTitle: {
    fontSize: '1.15rem', fontWeight: 700, color: '#e2e2ea', margin: '0 0 16px',
  },

  tabGroup: { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn: {
    padding: '8px 18px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
    color: '#6b6b77', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
  },
  tabBtnActive: {
    background: 'rgba(255,255,255,0.06)',
  },

  table: { display: 'flex', flexDirection: 'column' },
  tableHeader: {
    display: 'flex', padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  th: {
    fontSize: '0.7rem', fontWeight: 700, color: '#5a5a66',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'flex', alignItems: 'center', padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.15s',
  },
  td: { fontSize: '0.88rem' },

  badge: {
    display: 'inline-block', padding: '4px 10px', borderRadius: 6,
    fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
    border: '1px solid',
  },

  approveBtn: {
    padding: '6px 14px', borderRadius: 8,
    background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
    color: '#22c55e', fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
  },
  rejectBtn: {
    padding: '6px 14px', borderRadius: 8,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#ef4444', fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
  },
  deleteBtn: {
    padding: '6px 10px', borderRadius: 8,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
  },

  filterSelect: {
    padding: '8px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
    color: '#e2e2ea', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
  },

  emptyState: {
    textAlign: 'center', padding: '40px 20px',
    background: 'rgba(255,255,255,0.01)', borderRadius: 12,
  },

  loadingSpinner: {
    width: 36, height: 36, margin: '0 auto',
    border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ef4444',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
};

export default AdminDashboard;
