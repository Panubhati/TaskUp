import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('token');
  const [visible, setVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    setVisible(true);
  }, []);

  const stats = [
  ];

  const steps = [
    { num: '01', title: 'Sign Up', desc: 'Create your account and choose your role — student or company.', icon: '🔐' },
    { num: '02', title: 'Explore Challenges', desc: 'Browse real-world coding tasks posted by top companies.', icon: '🔍' },
    { num: '03', title: 'Solve & Submit', desc: 'Write solutions in C++, Java, Python or JavaScript with our built-in editor.', icon: '💻' },
    { num: '04', title: 'Get Ranked', desc: 'Your code is compiled and scored — climb the leaderboard.', icon: '🏅' },
  ];

  const features = [
    { icon: '⚡', title: 'Real-Time Compiler', desc: 'Write, compile, and test code in 4+ languages with instant feedback.' },
    { icon: '🎯', title: 'Company Challenges', desc: 'Solve real tasks from companies actively looking to hire top talent.' },
    { icon: '📊', title: 'Live Leaderboards', desc: 'Compete with thousands. Rankings update in real-time after every submission.' },
    { icon: '🔒', title: 'Secure Evaluation', desc: 'Code is tested against hidden test cases for fair and accurate scoring.' },
    { icon: '📄', title: 'Resume Review', desc: 'Get your resume analyzed with detailed scoring and improvement tips.' },
    { icon: '🏢', title: 'Company Dashboard', desc: 'Companies get powerful analytics to track and compare candidates.' },
  ];

  const faqs = [
    { q: 'What languages are supported?', a: 'TaskUp supports JavaScript, Python, C++, and Java. All solutions are compiled and tested in real-time.' },
    { q: 'Is TaskUp free to use?', a: 'Yes! Students can sign up, solve challenges, and compete on leaderboards completely free of charge.' },
    { q: 'How are submissions scored?', a: 'Your code is compiled against hidden test cases. Scoring is based on correctness (50%), optimization (30%), and originality (20%).' },
    { q: 'Can companies post their own challenges?', a: 'Absolutely. Companies can create custom assignments from our question bank, set deadlines, and track candidate performance.' },
    { q: 'How does the leaderboard work?', a: 'Rankings are calculated based on your aggregate scores across all challenges. The more you solve, the higher you climb.' },
    { q: 'Is my submission code private?', a: 'Yes. Only the company that created the challenge can see your submission. Other companies and users cannot access it.' },
  ];

  const handleGetStarted = () => {
    navigate(isLoggedIn ? '/compete' : '/signup');
  };

  const handleLearnMore = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={S.page}>

      {/* ══════ Hero ══════ */}
      <section style={S.hero}>
        <div style={S.heroGlow1} />
        <div style={S.heroGlow2} />
        <div style={S.heroGrid} />

        <div style={{
          ...S.heroContent,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={S.heroBadge}>
            <span style={S.heroBadgeDot} />
            Now open for all developers
          </div>
          <h1 style={S.heroTitle}>
            Code. Compete.<br />
            <span style={S.heroGradient}>Get Hired.</span>
          </h1>
          <p style={S.heroSub}>
            The competitive coding platform where developers solve real-world challenges
            from top companies, get ranked on live leaderboards, and land opportunities.
          </p>
          <div style={S.heroCta}>
            <button style={S.btnPrimary} onClick={handleGetStarted}>
              {isLoggedIn ? 'Start Competing' : 'Get Started Free'}
              <span style={S.btnArrow}>→</span>
            </button>
            <button style={S.btnGhost} onClick={handleLearnMore}>
              How it Works
            </button>
          </div>
        </div>

        {/* Stats */}

      </section>

      {/* ══════ How It Works ══════ */}
      <section id="how-it-works" style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionHead}>
            <span style={S.sectionTag}>HOW IT WORKS</span>
            <h2 style={S.sectionTitle}>Four Steps to the Leaderboard</h2>
            <p style={S.sectionSub}>Join, code, submit, and see your name rise in the rankings.</p>
          </div>
          <div style={S.stepsGrid}>
            {steps.map((s, i) => (
              <div key={i} style={S.stepCard}>
                <div style={S.stepNum}>{s.num}</div>
                <div style={S.stepIcon}>{s.icon}</div>
                <h3 style={S.stepTitle}>{s.title}</h3>
                <p style={S.stepDesc}>{s.desc}</p>
                {i < steps.length - 1 && <div style={S.stepConnector}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Features ══════ */}
      <section style={{ ...S.section, background: 'linear-gradient(180deg, #0a0a0f 0%, #0e0e1a 50%, #0a0a0f 100%)' }}>
        <div style={S.sectionInner}>
          <div style={S.sectionHead}>
            <span style={S.sectionTag}>PLATFORM</span>
            <h2 style={S.sectionTitle}>Built for Serious Developers</h2>
            <p style={S.sectionSub}>Everything you need to prove your skills and stand out.</p>
          </div>
          <div style={S.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} style={S.featureCard}>
                <div style={S.featureIcon}>{f.icon}</div>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionHead}>
            <span style={S.sectionTag}>FAQ</span>
            <h2 style={S.sectionTitle}>Frequently Asked Questions</h2>
            <p style={S.sectionSub}>Everything you need to know about TaskUp.</p>
          </div>
          <div style={S.faqList}>
            {faqs.map((faq, i) => (
              <div key={i} style={S.faqItem}>
                <button
                  style={S.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span style={S.faqQ}>{faq.q}</span>
                  <span style={{
                    ...S.faqChevron,
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',
                  }}>▾</span>
                </button>
                {openFaq === i && (
                  <div style={S.faqAnswer}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section style={S.ctaSection}>
        <div style={S.ctaInner}>
          <div style={S.ctaGlow} />
          <span style={S.ctaEmoji}>🚀</span>
          <h2 style={S.ctaTitle}>Ready to prove your skills?</h2>
          <p style={S.ctaSub}>Join thousands of developers competing on real challenges from real companies.</p>
          <button style={S.btnPrimary} onClick={handleGetStarted}>
            {isLoggedIn ? 'Go to Challenges' : 'Create Free Account'}
            <span style={S.btnArrow}>→</span>
          </button>
        </div>
      </section>

      {/* ══════ Footer ══════ */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>
            <span style={S.footerLogo}>⚡</span>
            <span style={S.footerName}>TaskUp</span>
          </div>
          <div style={S.footerLinks}>
            <span style={S.footerLink} onClick={() => navigate('/compete')}>Challenges</span>
            <span style={S.footerLink} onClick={() => navigate('/signup')}>Sign Up</span>
            <span style={S.footerLink} onClick={() => navigate('/login')}>Login</span>
          </div>
          <div style={S.footerCopy}>© 2026 TaskUp. Built for developers who compete.</div>
        </div>
      </footer>
    </div>
  );
};

/* ═══════════════════ Styles ═══════════════════ */
const S = {
  page: { background: 'var(--bg-primary, #0a0a0f)', minHeight: '100vh', fontFamily: 'inherit' },

  // Hero
  hero: {
    position: 'relative',
    minHeight: 'calc(100vh - 64px)',
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'var(--gradient-hero, linear-gradient(160deg, #0a0a0f 0%, #12102a 30%, #0c1426 60%, #0a0a0f 100%))',
  },
  heroGlow1: {
    position: 'absolute', top: '5%', left: '10%', width: 350, height: 350, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
    filter: 'blur(60px)', pointerEvents: 'none',
  },
  heroGlow2: {
    position: 'absolute', bottom: '10%', right: '15%', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
    filter: 'blur(50px)', pointerEvents: 'none',
  },
  heroGrid: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
  },
  heroContent: { position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 720 },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 18px', borderRadius: 50,
    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
    color: '#818cf8', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 28,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px rgba(99,102,241,0.6)' },
  heroTitle: { fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.08, color: 'var(--text-primary, #f1f1f3)', letterSpacing: '-1.5px', marginBottom: 22 },
  heroGradient: { background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSub: { fontSize: '1.05rem', color: 'var(--text-muted, #7c7c8a)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 36px', fontWeight: 400 },
  heroCta: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },

  // Buttons
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '14px 30px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 24px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    transition: 'all 0.25s ease',
  },
  btnArrow: { fontSize: '1.1rem', transition: 'transform 0.2s' },
  btnGhost: {
    padding: '14px 30px', background: 'transparent',
    color: '#7c7c8a', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, fontSize: '0.95rem', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.25s ease',
  },

  // Stats
  statsBar: {
    position: 'relative', zIndex: 2,
    display: 'flex', gap: 40, marginTop: 64,
    padding: '28px 48px',
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 16, flexWrap: 'wrap', justifyContent: 'center',
  },
  statItem: { textAlign: 'center', minWidth: 80 },
  statIcon: { fontSize: '1.2rem', display: 'block', marginBottom: 6 },
  statValue: { fontSize: '1.7rem', fontWeight: 800, color: '#f1f1f3', letterSpacing: '-0.5px' },
  statLabel: { fontSize: '0.72rem', color: '#5a5a66', fontWeight: 500, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Section
  section: { padding: '80px 24px' },
  sectionInner: { maxWidth: 1060, margin: '0 auto' },
  sectionHead: { textAlign: 'center', marginBottom: 48 },
  sectionTag: {
    display: 'inline-block', padding: '4px 14px', borderRadius: 50,
    background: 'rgba(99,102,241,0.08)', color: '#818cf8',
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12,
  },
  sectionTitle: { fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #f1f1f3)', letterSpacing: '-0.5px', marginBottom: 8 },
  sectionSub: { fontSize: '0.95rem', color: 'var(--text-muted, #5a5a66)', maxWidth: 480, margin: '0 auto' },

  // Steps
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  stepCard: {
    position: 'relative', padding: '28px 22px',
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 14, transition: 'border-color 0.3s',
  },
  stepNum: { position: 'absolute', top: 14, right: 16, fontWeight: 800, color: 'rgba(99,102,241,0.12)', fontSize: '2.2rem', letterSpacing: '-2px' },
  stepIcon: { fontSize: '1.6rem', marginBottom: 14 },
  stepTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary, #f1f1f3)', marginBottom: 6 },
  stepDesc: { fontSize: '0.83rem', color: '#6b6b78', lineHeight: 1.6 },
  stepConnector: { display: 'none' },

  // Features
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  featureCard: {
    padding: '26px 22px',
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 14, transition: 'border-color 0.3s, transform 0.3s',
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.08))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.2rem', marginBottom: 14,
  },
  featureTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f1f1f3)', marginBottom: 6 },
  featureDesc: { fontSize: '0.82rem', color: '#6b6b78', lineHeight: 1.6 },

  // FAQ
  faqList: { maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 },
  faqItem: {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
  },
  faqQuestion: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', background: 'transparent', border: 'none',
    color: '#e4e4e8', fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  faqQ: { flex: 1, marginRight: 12 },
  faqChevron: { color: '#6366f1', fontSize: '1rem', transition: 'transform 0.25s ease', flexShrink: 0 },
  faqAnswer: {
    padding: '0 20px 16px', fontSize: '0.85rem',
    color: '#7c7c8a', lineHeight: 1.7,
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: 14,
  },

  // CTA
  ctaSection: { padding: '0 24px 80px' },
  ctaInner: {
    position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center',
    padding: '56px 40px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(14,165,233,0.04))',
    border: '1px solid rgba(99,102,241,0.12)',
    borderRadius: 20, overflow: 'hidden',
  },
  ctaGlow: {
    position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
    width: 400, height: 200, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
    filter: 'blur(40px)', pointerEvents: 'none',
  },
  ctaEmoji: { fontSize: '2.5rem', display: 'block', marginBottom: 14 },
  ctaTitle: { fontSize: '1.8rem', fontWeight: 700, color: '#f1f1f3', marginBottom: 10, letterSpacing: '-0.5px' },
  ctaSub: { fontSize: '0.95rem', color: '#6b6b78', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' },

  // Footer
  footer: { borderTop: '1px solid rgba(255,255,255,0.04)', padding: '28px 24px' },
  footerInner: {
    maxWidth: 1060, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 16,
  },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 8 },
  footerLogo: { fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' },
  footerName: {
    fontSize: '1.05rem', fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  footerLinks: { display: 'flex', gap: 20 },
  footerLink: { fontSize: '0.82rem', color: '#5a5a66', cursor: 'pointer', transition: 'color 0.2s', fontWeight: 500 },
  footerCopy: { fontSize: '0.75rem', color: '#3a3a44' },
};

export default Dashboard;