// src/pages/RefundPolicy.jsx
import "./LegalPage.css";

export default function RefundPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Policy</div>
          <h1 className="legal-title">Refund & Return Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market is a marketplace connecting buyers with independent sellers. Each seller manages their own return policy. This document outlines our platform-level buyer protections and refund process.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Buyer Protection</h2>
          <div className="legal-section-body">
            <p>You are eligible for a refund if:</p>
            <ul>
              <li>The item you received is significantly different from what was described or pictured</li>
              <li>The item was damaged in transit (you must provide photo evidence within 48 hours of delivery)</li>
              <li>Your order was never delivered and the seller cannot provide proof of delivery</li>
              <li>You were charged but the seller cancelled your order</li>
              <li>The product is counterfeit or fake (verified by our team)</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">How to Request a Refund</h2>
          <div className="legal-section-body">
            <ol>
              <li>First, contact the seller directly through your order page within 5 days of receiving your item</li>
              <li>If the seller does not respond within 48 hours or refuses a legitimate refund, open a dispute through our platform</li>
              <li>Provide evidence: photos, screenshots of communications, and a description of the issue</li>
              <li>Our team will review the dispute within 3–5 business days</li>
              <li>If resolved in your favor, refunds are processed to your original payment method within 5–7 business days</li>
            </ol>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Non-Refundable Items</h2>
          <div className="legal-section-body">
            <p>The following are generally <strong>not eligible for refunds</strong>:</p>
            <ul>
              <li>Digital products (ebooks, templates, downloadable files) once downloaded</li>
              <li>Perishable food items</li>
              <li>Custom or personalized products made to order</li>
              <li>Items explicitly marked as "no returns" by the seller — provided the item matches the description</li>
              <li>Change-of-mind returns (unless the seller accepts them)</li>
              <li>Subscription fees for seller plans</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Seller Refund Responsibilities</h2>
          <div className="legal-section-body">
            <p>Sellers must clearly state their return policy on their store page. Sellers are required to:</p>
            <ul>
              <li>Honor any return/refund policy they advertise on their store</li>
              <li>Process approved refunds within 5 business days</li>
              <li>Not delay or deny legitimate refunds out of bad faith</li>
            </ul>
            <p>Sellers who consistently refuse legitimate refunds may have their accounts suspended and outstanding refunds deducted from their payouts.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Chargebacks</h2>
          <div className="legal-section-body">
            <p>If you initiate a chargeback with your bank without first attempting resolution through Beme Market, we reserve the right to: suspend your account pending investigation, share transaction evidence with your bank, and restrict future purchases. We encourage resolving disputes through our platform first, as chargebacks harm honest sellers.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Subscription Refunds</h2>
          <div className="legal-section-body">
            <p>Seller subscription fees (Basic, Standard, Pro) are <strong>non-refundable</strong>. Once a subscription payment is made, the plan is activated for the full 30-day billing period regardless of usage. Upgrading or downgrading plans does not generate a refund for the current billing period.</p>
          </div>
        </div>

        <div className="legal-footer-note">
          Refund disputes? Email <a href="mailto:support@beme.market">support@beme.market</a> or open a dispute from your order page.
        </div>
      </div>
    </div>
  );
}

