import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = 'March 29, 2026';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Privacy Policy</h1>
        <p style={styles.lastUpdated}>Last Updated: {lastUpdated}</p>

        <div style={styles.content}>
          <Section title="1. Introduction">
            <p>
              Welcome to TheNileKart ("we", "our", "us"). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our website at{' '}
              <a href="https://www.thenilekart.com" style={styles.link}>www.thenilekart.com</a> and our
              mobile application (collectively, the "Platform").
            </p>
            <p>
              By using our Platform, you agree to the collection and use of information in accordance
              with this policy. If you do not agree with the terms of this Privacy Policy, please do not
              access or use the Platform.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h4 style={styles.subheading}>Personal Information</h4>
            <p>When you register, place an order, or interact with our Platform, we may collect:</p>
            <ul style={styles.list}>
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Shipping and billing address</li>
              <li>Payment information (processed securely through third-party payment processors)</li>
            </ul>

            <h4 style={styles.subheading}>Automatically Collected Information</h4>
            <p>When you access our Platform, we may automatically collect:</p>
            <ul style={styles.list}>
              <li>Device information (device type, operating system, browser type)</li>
              <li>IP address and approximate location</li>
              <li>Usage data (pages visited, time spent, click patterns)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul style={styles.list}>
              <li>Process and fulfill your orders</li>
              <li>Create and manage your account</li>
              <li>Send order confirmations, updates, and delivery notifications</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send promotional offers, discounts, and marketing communications (with your consent)</li>
              <li>Improve our Platform, products, and services</li>
              <li>Detect and prevent fraud or unauthorized activities</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Push Notifications">
            <p>
              With your consent, we may send push notifications to your device to inform you about order
              updates, promotional offers, and important announcements. You can opt out of push
              notifications at any time through your device settings or your account preferences.
            </p>
          </Section>

          <Section title="5. Sharing of Information">
            <p>We may share your information with:</p>
            <ul style={styles.list}>
              <li><strong>Service Providers:</strong> Third-party companies that assist us in operating our
                Platform, processing payments, delivering orders, and providing customer support.</li>
              <li><strong>Payment Processors:</strong> Secure third-party payment gateways to process your
                transactions. We do not store your complete payment card details.</li>
              <li><strong>Delivery Partners:</strong> Shipping and logistics companies to fulfill and deliver
                your orders.</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
            </ul>
            <p>
              We do not sell, trade, or rent your personal information to third parties for marketing purposes.
            </p>
          </Section>

          <Section title="6. Data Security">
            <p>
              We implement appropriate technical and organizational security measures to protect your
              personal information against unauthorized access, alteration, disclosure, or destruction.
              These measures include:
            </p>
            <ul style={styles.list}>
              <li>SSL/TLS encryption for data transmitted between your device and our servers</li>
              <li>Secure storage of personal data with access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Hashed and salted password storage</li>
            </ul>
            <p>
              While we strive to protect your personal information, no method of transmission over the
              Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              We use cookies and similar technologies to enhance your browsing experience, remember your
              preferences, and analyze Platform usage. You can control cookie preferences through your
              browser settings. Disabling cookies may affect certain features of the Platform.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your jurisdiction, you may have the following rights:</p>
            <ul style={styles.list}>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal obligations.</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
              <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:customer-service@thenilekart.com" style={styles.link}>
                customer-service@thenilekart.com
              </a>.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Our Platform is not intended for children under the age of 13. We do not knowingly collect
              personal information from children under 13. If we become aware that we have collected
              personal data from a child under 13, we will take steps to delete such information promptly.
            </p>
          </Section>

          <Section title="10. Third-Party Links">
            <p>
              Our Platform may contain links to third-party websites or services. We are not responsible
              for the privacy practices of these external sites. We encourage you to review the privacy
              policies of any third-party sites you visit.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this
              page with an updated "Last Updated" date. We encourage you to review this page periodically.
              Continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <div style={styles.contactBox}>
              <p style={{ margin: '4px 0' }}><strong>TheNileKart</strong></p>
              <p style={{ margin: '4px 0' }}>
                Email:{' '}
                <a href="mailto:customer-service@thenilekart.com" style={styles.link}>
                  customer-service@thenilekart.com
                </a>
              </p>
              <p style={{ margin: '4px 0' }}>
                Instagram:{' '}
                <a href="https://www.instagram.com/thenilekart" target="_blank" rel="noopener noreferrer" style={styles.link}>
                  @thenilekart
                </a>
              </p>
              <p style={{ margin: '4px 0' }}>
                Website:{' '}
                <a href="https://www.thenilekart.com" style={styles.link}>
                  www.thenilekart.com
                </a>
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    <div style={styles.sectionBody}>{children}</div>
  </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: 'calc(100vh - 80px)',
    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fff 100%)',
    padding: '40px 20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(236, 72, 153, 0.1)',
    padding: '48px 40px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  heading: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  lastUpdated: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    margin: '0 0 36px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  section: {
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#be185d',
    margin: '0 0 12px',
  },
  sectionBody: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: '1.7',
  },
  subheading: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '16px 0 8px',
  },
  list: {
    paddingLeft: '24px',
    margin: '8px 0 16px',
    lineHeight: '1.8',
  },
  link: {
    color: '#ec4899',
    textDecoration: 'none',
    fontWeight: 500,
  },
  contactBox: {
    background: '#fdf2f8',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '12px',
    border: '1px solid #fce7f3',
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: '1.6',
  },
};

export default PrivacyPolicyPage;
