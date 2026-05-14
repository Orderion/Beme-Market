// src/pages/CommunityGuidelines.jsx
import "./LegalPage.css";

export default function CommunityGuidelines() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Community</div>
          <h1 className="legal-title">Community Guidelines</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market is a community of buyers, sellers, and creators across Ghana. These guidelines exist to keep our marketplace safe, respectful, and thriving for everyone. By using Beme Market, you agree to uphold these standards.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Honest</h2>
          <div className="legal-section-body">
            <p>Honesty is the foundation of trust on Beme Market. This means:</p>
            <ul>
              <li>Representing yourself and your products accurately</li>
              <li>Not making false claims about product quality, origin, or effectiveness</li>
              <li>Not creating fake profiles, reviews, or engagement</li>
              <li>Disclosing any material facts that might affect a buyer's decision</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Respectful</h2>
          <div className="legal-section-body">
            <p>Every person on Beme Market deserves to be treated with dignity. We do not tolerate:</p>
            <ul>
              <li>Harassment, threats, or intimidation of any kind</li>
              <li>Hate speech based on ethnicity, religion, gender, disability, or sexual orientation</li>
              <li>Abusive language in messages, reviews, or public content</li>
              <li>Discrimination against buyers or sellers</li>
              <li>Doxxing — sharing private information about other users without consent</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Safe</h2>
          <div className="legal-section-body">
            <ul>
              <li>Never share your Beme Market account credentials with anyone</li>
              <li>Be cautious of phishing attempts — Beme Market will never ask for your password via message</li>
              <li>Report suspicious seller activity or listings to our trust and safety team</li>
              <li>Do not meet strangers in unsafe locations for product pickup — use public places</li>
              <li>Protect your financial information — only pay through Beme Market's secure checkout</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Protect Ghana's Marketplace</h2>
          <div className="legal-section-body">
            <p>Beme Market is built to empower Ghanaian businesses. Help us keep it great:</p>
            <ul>
              <li>Buy and sell within the spirit of fair trade</li>
              <li>Support local sellers and Ghanaian-made products</li>
              <li>Leave honest, helpful reviews to guide other shoppers</li>
              <li>Report counterfeit goods to protect authentic Ghanaian businesses</li>
              <li>Encourage other sellers to follow platform standards</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Reporting Violations</h2>
          <div className="legal-section-body">
            <p>If you encounter content, listings, or behavior that violates these guidelines:</p>
            <ul>
              <li>Use the "Report" button on any product, seller, or message</li>
              <li>Email our trust and safety team at <a href="mailto:safety@beme.market">safety@beme.market</a></li>
              <li>For urgent matters (fraud, threats), contact us immediately</li>
            </ul>
            <p>All reports are reviewed within 24–48 hours. We take every report seriously.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Consequences</h2>
          <div className="legal-section-body">
            <p>Violations of these guidelines may result in:</p>
            <ul>
              <li>Warning issued to your account</li>
              <li>Temporary restriction of features</li>
              <li>Listing or content removal</li>
              <li>Account suspension</li>
              <li>Permanent ban and legal action for serious violations</li>
            </ul>
          </div>
        </div>

        <div className="legal-footer-note">
          Questions about our community? <a href="mailto:community@beme.market">community@beme.market</a>
        </div>
      </div>
    </div>
  );
}

