import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [college, setCollege] = useState('');
  const [qualifyingYear, setQualifyingYear] = useState('');
  const [city, setCity] = useState('');
  // Company-specific fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (role === 'student' && (!email || !phone || !college)) {
      setError('Email, phone, and college are required for students');
      return;
    }
    if (role === 'company' && (!companyName || !companyEmail)) {
      setError('Company name and email are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = { username, password, role };
      if (role === 'student') {
        payload.email = email;
        payload.phone = phone;
        payload.dob = dob || undefined;
        payload.college = college;
        payload.qualifyingYear = qualifyingYear || undefined;
        payload.city = city || undefined;
      }
      if (role === 'company') {
        payload.companyName = companyName;
        payload.email = companyEmail;
        payload.city = companyCity || undefined;
      }
      const res = await axios.post('http://localhost:5000/api/auth/signup', payload);

      if (role === 'company') {
        setSuccessMsg(res.data.message || 'Registration submitted! Awaiting admin approval.');
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y <= currentYear + 6; y++) years.push(y);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.topBar} />

        <div style={S.header}>
          <h1 style={S.title}>Create account</h1>
          <p style={S.subtitle}>Join the TaskUp community</p>
        </div>

        {/* Success message for company pending */}
        {successMsg && (
          <div style={S.successBox}>
            <div style={S.successIcon}>✅</div>
            <h3 style={S.successTitle}>Registration Submitted!</h3>
            <p style={S.successText}>{successMsg}</p>
            <Link to="/login" style={S.successLink}>Go to Login →</Link>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} style={S.form}>
            {/* Role selector */}
            <div style={S.field}>
              <label style={S.label}>I am a</label>
              <div style={S.roleGroup}>
                <button type="button" onClick={() => setRole('student')}
                  style={{ ...S.roleBtn, ...(role === 'student' ? S.roleBtnActive : {}) }}>
                  <span style={{ fontSize: '1.1rem' }}>🎓</span> Student
                </button>
                <button type="button" onClick={() => setRole('company')}
                  style={{ ...S.roleBtn, ...(role === 'company' ? S.roleBtnActive : {}) }}>
                  <span style={{ fontSize: '1.1rem' }}>🏢</span> Company
                </button>
              </div>
            </div>

            {/* Username & Password — always shown */}
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Username *</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  style={S.input} placeholder="Choose a username" disabled={isLoading} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  style={S.input} placeholder="Create a password" disabled={isLoading} />
              </div>
            </div>

            {/* Company-specific fields */}
            {role === 'company' && (
              <>
                <div style={S.divider}>
                  <span style={S.dividerLine} />
                  <span style={S.dividerText}>Company Details</span>
                  <span style={S.dividerLine} />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Company Name *</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                    style={S.input} placeholder="e.g. Google, Infosys" disabled={isLoading} />
                </div>

                <div style={S.row}>
                  <div style={S.field}>
                    <label style={S.label}>Company Email *</label>
                    <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
                      style={S.input} placeholder="hr@company.com" disabled={isLoading} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>City</label>
                    <input type="text" value={companyCity} onChange={e => setCompanyCity(e.target.value)}
                      style={S.input} placeholder="e.g. Bangalore" disabled={isLoading} />
                  </div>
                </div>

                <div style={S.infoBox}>
                  <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                  <p style={S.infoText}>
                    Company accounts require admin approval. You'll be notified once approved.
                  </p>
                </div>
              </>
            )}

            {/* Student-specific fields */}
            {role === 'student' && (
              <>
                <div style={S.divider}>
                  <span style={S.dividerLine} />
                  <span style={S.dividerText}>Student Details</span>
                  <span style={S.dividerLine} />
                </div>

                <div style={S.row}>
                  <div style={S.field}>
                    <label style={S.label}>Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      style={S.input} placeholder="your@email.com" disabled={isLoading} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Phone *</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      style={S.input} placeholder="+91 9876543210" disabled={isLoading} />
                  </div>
                </div>

                <div style={S.row}>
                  <div style={S.field}>
                    <label style={S.label}>Date of Birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                      style={{ ...S.input, colorScheme: 'dark' }} disabled={isLoading} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>City</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      style={S.input} placeholder="e.g. Mumbai" disabled={isLoading} />
                  </div>
                </div>

                <div style={S.field}>
                  <label style={S.label}>College / University *</label>
                  <input type="text" value={college} onChange={e => setCollege(e.target.value)}
                    style={S.input} placeholder="e.g. IIT Bombay" disabled={isLoading} />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Qualifying Year</label>
                  <select value={qualifyingYear} onChange={e => setQualifyingYear(e.target.value)}
                    style={S.input} disabled={isLoading}>
                    <option value="">Select year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={S.error}>
                <span style={{ marginRight: 8 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              style={{ ...S.button, ...(isLoading ? S.buttonLoading : {}) }}>
              {isLoading && <span style={S.spinner} />}
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        <div style={S.footer}>
          <span style={S.footerText}>Already have an account? </span>
          <Link to="/login" style={S.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

const S = {
  page: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: 'calc(100vh - 64px)', padding: '40px 20px', background: '#0a0a0f',
  },
  card: {
    width: '100%', maxWidth: '480px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20, overflow: 'hidden',
  },
  topBar: { height: 3, background: 'linear-gradient(90deg, #6366f1, #0ea5e9)' },
  header: { padding: '32px 32px 0', textAlign: 'center' },
  title: { fontSize: '1.6rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 6, letterSpacing: '-0.5px' },
  subtitle: { fontSize: '0.88rem', color: '#5a5a66' },
  form: { padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 },
  row: { display: 'flex', gap: 12 },
  label: { fontSize: '0.72rem', fontWeight: 700, color: '#5a5a66', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
    color: '#f1f1f3', fontSize: '0.9rem', outline: 'none',
    transition: 'all 0.2s ease', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  roleGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  roleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)', color: '#94949e', fontSize: '0.88rem',
    fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  roleBtnActive: {
    border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#818cf8',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' },
  dividerText: { fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0 },
  infoBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '14px 16px', borderRadius: 12,
    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
  },
  infoText: {
    color: '#a5b4fc', fontSize: '0.82rem', lineHeight: 1.5, margin: 0,
  },
  successBox: {
    margin: '24px 32px', padding: '28px 24px', borderRadius: 16,
    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  successIcon: { fontSize: '2.2rem' },
  successTitle: { color: '#10b981', fontSize: '1.15rem', fontWeight: 700, margin: 0 },
  successText: { color: '#6ee7b7', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 },
  successLink: {
    marginTop: 8, display: 'inline-block', padding: '10px 24px', borderRadius: 10,
    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
    fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
  },
  error: {
    padding: '10px 14px', background: 'rgba(244,63,94,0.08)',
    border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10,
    color: '#f43f5e', fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center',
  },
  button: {
    width: '100%', padding: 14,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.92rem', fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', marginTop: 4, transition: 'all 0.25s',
  },
  buttonLoading: { opacity: 0.7, cursor: 'not-allowed' },
  spinner: {
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
  footer: { textAlign: 'center', padding: '0 32px 28px' },
  footerText: { color: '#5a5a66', fontSize: '0.85rem' },
  link: { color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' },
};

export default Signup;