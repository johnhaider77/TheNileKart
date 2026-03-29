import React from 'react';

const SupportPage: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 style={styles.heading}>Customer Support</h1>
        <p style={styles.subtitle}>
          We're here to help! Reach out with your queries, suggestions, and complaints at:
        </p>

        <div style={styles.contactSection}>
          <a href="mailto:customer-service@thenilekart.com" style={styles.contactCard}>
            <div style={styles.contactIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <div style={styles.contactLabel}>Email</div>
              <div style={styles.contactValue}>customer-service@thenilekart.com</div>
            </div>
          </a>

          <a href="https://www.instagram.com/thenilekart" target="_blank" rel="noopener noreferrer" style={styles.contactCard}>
            <div style={styles.contactIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </div>
            <div>
              <div style={styles.contactLabel}>Instagram</div>
              <div style={styles.contactValue}>@thenilekart</div>
            </div>
          </a>
        </div>

        <div style={styles.responseNote}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>We typically respond within 24 hours</span>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: 'calc(100vh - 80px)',
    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(236, 72, 153, 0.1)',
    padding: '48px 40px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center' as const,
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#fdf2f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 32px',
  },
  contactSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '28px',
  },
  contactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '18px 20px',
    borderRadius: '14px',
    border: '1px solid #fce7f3',
    background: '#fdf2f8',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  contactIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(236, 72, 153, 0.1)',
  },
  contactLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 500,
    textAlign: 'left' as const,
    marginBottom: '2px',
  },
  contactValue: {
    fontSize: '15px',
    color: '#1f2937',
    fontWeight: 600,
    textAlign: 'left' as const,
  },
  responseNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#10b981',
    fontWeight: 500,
    padding: '12px 16px',
    background: '#ecfdf5',
    borderRadius: '10px',
  },
};

export default SupportPage;
