// src/pages/SellerPolicy.jsx
import "./LegalPage.css";

export default function SellerPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Policy</div>
          <h1 className="legal-title">Seller Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          This Seller Policy outlines the specific rules, standards, and expectations for all sellers on Beme Market. These rules exist to protect buyers, sellers, and the integrity of the platform.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Product Standards</h2>
          <div className="legal-section-body">
            <p>All products listed on Beme Market must meet the following standards:</p>
            <ul>
              <li><strong>Authenticity:</strong> Only sell genuine products. Counterfeit, replica, or fake branded goods are strictly prohibited and will result in immediate suspension.</li>
              <li><strong>Accurate Descriptions:</strong> Product titles, descriptions, and photos must accurately represent the item. Do not exaggerate quality, size, or features.</li>
              <li><strong>Original Photos:</strong> Use your own product photos wherever possible. If using stock images, they must accurately represent the actual product you are selling.</li>
              <li><strong>Condition:</strong> Clearly state whether products are new, used, refurbished, or second-hand. Any defects must be disclosed in the product description.</li>
              <li><strong>Pricing:</strong> Prices must be fair and consistent. Price gouging during high-demand periods may result in listing removal.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Order Fulfillment Standards</h2>
          <div className="legal-section-body">
            <ul>
              <li>Process orders within your stated processing time (default: 2 business days)</li>
              <li>Communicate promptly with customers regarding order status</li>
              <li>Package items securely to prevent damage during delivery</li>
              <li>Provide tracking information where available</li>
              <li>Honor your return and refund policies as stated on your store</li>
              <li>Resolve disputes professionally and in good faith</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Customer Service Standards</h2>
          <div className="legal-section-body">
            <ul>
              <li>Respond to customer messages within 24 hours during business days</li>
              <li>Communicate professionally and respectfully at all times</li>
              <li>Do not harass, threaten, or pressure customers</li>
              <li>Do not request personal financial information from customers</li>
              <li>Honor commitments made to customers (delivery dates, refunds, replacements)</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Prohibited Seller Activities</h2>
          <div className="legal-section-body">
            <div className="legal-warning">⚠️ Any of the following will result in immediate permanent ban:</div>
            <ul>
              <li>Accepting payment without delivering products (scamming customers)</li>
              <li>Delivering products significantly different from what was advertised</li>
              <li>Using multiple accounts to circumvent bans</li>
              <li>Manipulating or purchasing fake reviews</li>
              <li>Directing customers to transact off-platform after initial contact</li>
              <li>Sharing or selling customer data</li>
              <li>Operating a store on behalf of a banned seller</li>
              <li>Engaging in any form of discrimination against customers</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Performance Metrics</h2>
          <div className="legal-section-body">
            <p>Beme Market monitors seller performance. Accounts may be restricted or suspended if:</p>
            <ul>
              <li>Order cancellation rate exceeds 10%</li>
              <li>Customer complaint rate exceeds 5%</li>
              <li>Average response time exceeds 48 hours over 30 days</li>
              <li>Chargeback rate exceeds 2% of monthly transactions</li>
              <li>Multiple verified reports of undelivered items</li>
            </ul>
          </div>
        </div>

        <div className="legal-footer-note">
          Policy questions? Email <a href="mailto:sellers@beme.market">sellers@beme.market</a>
        </div>
      </div>
    </div>
  );
}

