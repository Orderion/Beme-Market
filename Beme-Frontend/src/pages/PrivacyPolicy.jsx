// src/pages/PrivacyPolicy.jsx
import "./LegalPage.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Privacy</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market ("we", "us", "our") is committed to protecting your personal data. This policy explains what data we collect, how we use it, and your rights regarding your information.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">1. Data We Collect</h2>
          <div className="legal-section-body">
            <p><strong>Account Data:</strong> Name, email address, phone number, and profile photo when you register.</p>
            <p><strong>Seller Data:</strong> Business name, store details, product listings, bank/MoMo account details for payouts, and identity documents submitted for verification.</p>
            <p><strong>Transaction Data:</strong> Orders placed or received, payment amounts, references, and transaction history.</p>
            <p><strong>Usage Data:</strong> Pages visited, search queries, products viewed, and time spent on the platform. Collected via cookies and analytics tools.</p>
            <p><strong>Communication Data:</strong> Messages sent through our platform, including seller-buyer chat.</p>
            <p><strong>Device Data:</strong> IP address, browser type, operating system, and device identifiers.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">2. How We Use Your Data</h2>
          <div className="legal-section-body">
            <ul>
              <li>To provide, maintain, and improve our marketplace services</li>
              <li>To process payments and facilitate transactions between buyers and sellers</li>
              <li>To verify seller identities and prevent fraud</li>
              <li>To send transactional notifications (order updates, payment confirmations)</li>
              <li>To send marketing communications (only with your consent)</li>
              <li>To comply with legal obligations and regulatory requirements</li>
              <li>To resolve disputes and enforce our terms</li>
              <li>To generate anonymized analytics for platform improvement</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">3. Data Sharing</h2>
          <div className="legal-section-body">
            <p>We do not sell your personal data. We share data only in these circumstances:</p>
            <ul>
              <li><strong>With Sellers:</strong> Your name and delivery address are shared with sellers to fulfill your orders.</li>
              <li><strong>With Paystack:</strong> Payment processing requires sharing transaction data with Paystack in accordance with their <a href="https://paystack.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</li>
              <li><strong>With Firebase/Google:</strong> Our platform is built on Firebase. Data is stored in Google's secure data centers.</li>
              <li><strong>With Law Enforcement:</strong> When required by Ghanaian law, court order, or to prevent harm.</li>
              <li><strong>With Auditors:</strong> In cases of fraud investigation or financial audit.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">4. Data Retention</h2>
          <div className="legal-section-body">
            <p>We retain your data for as long as your account is active. After account deletion: transaction records are kept for 7 years for tax/legal compliance; identity documents are retained for 3 years; chat messages are deleted within 90 days; analytics data is anonymized and retained indefinitely.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">5. Your Rights</h2>
          <div className="legal-section-body">
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete data in your account settings</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time</li>
            </ul>
            <p>To exercise these rights, email <a href="mailto:privacy@beme.market">privacy@beme.market</a>.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">6. Cookies</h2>
          <div className="legal-section-body">
            <p>We use essential cookies for authentication and session management, and optional analytics cookies (which you can decline). We do not use third-party advertising cookies.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">7. Security</h2>
          <div className="legal-section-body">
            <p>We protect your data with: Firebase Authentication with encrypted credentials, HTTPS-only data transmission, Firestore security rules restricting data access, and Firebase Storage with authenticated access controls. Despite these measures, no system is 100% secure. Report security vulnerabilities to <a href="mailto:security@beme.market">security@beme.market</a>.</p>
          </div>
        </div>

        <div className="legal-footer-note">
          Privacy questions? Email <a href="mailto:privacy@beme.market">privacy@beme.market</a>
        </div>
      </div>
    </div>
  );
}

