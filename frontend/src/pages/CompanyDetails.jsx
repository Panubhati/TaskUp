import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CompanyDetails = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const completed = localStorage.getItem('companyDetailsCompleted');
    if (role !== 'company') {
      navigate('/');
    }
    if (completed === 'true') {
      navigate('/company-dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName) {
      setError('Company name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/company/details', {
        companyName, industry, companySize, website, companyDescription,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem('companyDetailsCompleted', 'true');
      window.location.href = '/company-dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save details');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeOptions = ['1-10', '11-50', '51-200', '201-500', '500+'];
  const industryOptions = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
    'Manufacturing', 'Consulting', 'Media', 'Telecom', 'Other',
  ];

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.topBar} />

        <div style={S.header}>
          <div style={S.iconWrap}>🏢</div>
          <h1 style={S.title}>Complete Your Profile</h1>
          <p style={S.subtitle}>
            Your account has been approved! Please fill in your company details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Company Name *</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              style={S.input} placeholder="e.g. Google, Infosys" disabled={isLoading} />
          </div>

          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                style={S.input} disabled={isLoading}>
                <option value="">Select industry</option>
                {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Company Size</label>
              <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                style={S.input} disabled={isLoading}>
                <option value="">Select size</option>
                {sizeOptions.map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Website</label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              style={S.input} placeholder="https://yourcompany.com" disabled={isLoading} />
          </div>

          <div style={S.field}>
            <label style={S.label}>About Your Company</label>
            <textarea value={companyDescription} onChange={e => setCompanyDescription(e.target.value)}
              style={{ ...S.input, minHeight: 100, resize: 'vertical' }}
              placeholder="Brief description of what your company does..."
              disabled={isLoading} />
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
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
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
    width: '100%', maxWidth: '520px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20, overflow: 'hidden',
  },
  topBar: { height: 3, background: 'linear-gradient(90deg, #10b981, #06b6d4)' },
  header: { padding: '32px 32px 0', textAlign: 'center' },
  iconWrap: { fontSize: '2.5rem', marginBottom: 8 },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 8, letterSpacing: '-0.5px' },
  subtitle: { fontSize: '0.88rem', color: '#6ee7b7', lineHeight: 1.5, margin: 0 },
  form: { padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 },
  row: { display: 'flex', gap: 12 },
  label: { fontSize: '0.72rem', fontWeight: 700, color: '#5a5a66', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
    color: '#f1f1f3', fontSize: '0.9rem', outline: 'none',
    transition: 'all 0.2s ease', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  error: {
    padding: '10px 14px', background: 'rgba(244,63,94,0.08)',
    border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10,
    color: '#f43f5e', fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center',
  },
  button: {
    width: '100%', padding: 14,
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.92rem', fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', marginTop: 4, transition: 'all 0.25s',
  },
  buttonLoading: { opacity: 0.7, cursor: 'not-allowed' },
  spinner: {
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
};

export default CompanyDetails;
