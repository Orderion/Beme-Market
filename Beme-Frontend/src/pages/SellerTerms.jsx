import "./LegalPage.css";

export default function SellerTerms() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Legal</div>
          <h1 className="legal-title">Seller Terms & Conditions</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>

        <div className="legal-intro">
          By creating a seller account, listing products, or accepting orders on Beme Market, you agree to be legally bound by these Seller Terms & Conditions. Read them carefully. If you do not agree, do not proceed with seller registration.
        </div>

        <Section title="1. Eligibility & Account Requirements">
          <p>To sell on Beme Market, you must: (a) be at least 18 years old or have parental consent; (b) be a resident of Ghana or legally authorized to conduct business in Ghana; (c) provide accurate registration information; (d) have a valid Mobile Money account or Ghanaian bank account for receiving payments.</p>
          <p>You are responsible for maintaining the security of your seller account. Any activity conducted through your account is your responsibility. Report unauthorized access immediately to <a href="mailto:support@beme.market">support@beme.market</a>.</p>
        </Section>

        <Section title="2. Subscription Plans & Fees">
          <p>Beme Market offers three subscription tiers:</p>
          <ul>
            <li><strong>Basic (Free):</strong> 25 products maximum. No monthly fee. Basic features only.</li>
            <li><strong>Standard (GHS 99/month):</strong> 500 products. Live chat, boosts, discount codes, verified badge eligibility.</li>
            <li><strong>Pro (GHS 249/month):</strong> Unlimited products. All Standard features plus AI tools, custom domain, loyalty system, Pro verified badge.</li>
          </ul>
          <p><strong>Payment:</strong> Subscription fees are charged monthly via Paystack. Accepted methods: MTN Mobile Money, Telecel, AirtelTigo, Visa, Mastercard.</p>
          <p><strong>Non-refundable:</strong> Subscription fees are non-refundable. Once payment is made, your plan is activated for 30 days regardless of usage.</p>
          <p><strong>Grace Period:</strong> If renewal payment fails, a 7-day grace period applies during which your store remains visible. After 7 days without renewal, your store is suspended and product listings are hidden.</p>
          <p><strong>Reactivation:</strong> Suspended stores can be reactivated by renewing the subscription payment.</p>
        </Section>

        <Section title="3. Prohibited Products & Listings">
          <div className="legal-warning">⚠️ Violation of these rules results in immediate store suspension and possible legal referral.</div>
          <p>The following are <strong>strictly prohibited</strong> on Beme Market:</p>
          <ul>
            <li>Counterfeit, replica, or fake branded goods (fake Nike, Louis Vuitton, iPhone, etc.)</li>
            <li>Stolen property or goods obtained through theft or fraud</li>
            <li>Illegal drugs, controlled substances, or drug paraphernalia</li>
            <li>Weapons, ammunition, or explosive materials</li>
            <li>Pornographic or sexually explicit content</li>
            <li>Human organs, body parts, or any form of human trafficking</li>
            <li>Pirated software, movies, music, or digital content</li>
            <li>Products that violate intellectual property rights</li>
            <li>Alcohol sold to minors or without proper licensing</li>
            <li>Prescription medications without valid pharmacy licensing</li>
            <li>Animals traded illegally under wildlife laws</li>
            <li>Gambling services or lottery products</li>
            <li>Products making false health claims or miracle cures</li>
            <li>Any product whose sale is prohibited under Ghanaian law</li>
          </ul>
        </Section>

        <Section title="4. Seller Conduct & Responsibilities">
          <p>As a seller on Beme Market, you agree to:</p>
          <ul>
            <li>Accurately describe all products including condition, size, material, and any defects</li>
            <li>Use only your own product photos or properly licensed images</li>
            <li>Fulfill orders within the stated processing time</li>
            <li>Communicate professionally with all customers</li>
            <li>Honor your stated return and refund policies</li>
            <li>Not engage in price manipulation or artificial inflation</li>
            <li>Not use fake reviews, review manipulation, or incentivized reviews without disclosure</li>
            <li>Not create multiple seller accounts to evade bans or gain unfair advantage</li>
            <li>Not misrepresent your location, credentials, or business identity</li>
            <li>Not conduct transactions off-platform to avoid fees after initial contact through Beme Market</li>
          </ul>
        </Section>

        <Section title="5. Fraud & Scam Prevention">
          <p>Beme Market employs multiple fraud detection systems. The following activities constitute fraud and will result in immediate suspension and possible criminal referral:</p>
          <ul>
            <li>Receiving payment and not delivering products</li>
            <li>Sending significantly different products from what was advertised</li>
            <li>Using forged or stolen identity documents for verification</li>
            <li>Creating fake orders to inflate your own ratings</li>
            <li>Chargebacks fraud or unauthorized payment reversals</li>
            <li>Phishing customers for personal or financial information</li>
            <li>Impersonating Beme Market staff</li>
            <li>Money laundering or using the platform for illegal fund transfers</li>
          </ul>
          <p>Beme Market cooperates fully with Ghana Police Service, Ghana Revenue Authority, and other regulatory bodies in fraud investigations.</p>
        </Section>

        <Section title="6. Payouts & Withdrawals">
          <p><strong>Minimum payout:</strong> GHS 50.00</p>
          <p><strong>Processing time:</strong> 1–3 business days after admin approval.</p>
          <p><strong>Methods:</strong> MTN Mobile Money, Telecel Cash, AirtelTigo Money, or Ghanaian bank transfer.</p>
          <p><strong>Accuracy:</strong> You are solely responsible for providing correct payment account details. Beme Market is not liable for payments sent to incorrect accounts based on details you provided.</p>
          <p><strong>Holds:</strong> Beme Market may hold payouts in the following circumstances: active disputes on your orders, suspected fraud, policy violations under investigation, or regulatory compliance requirements.</p>
          <p><strong>Fees:</strong> Beme Market reserves the right to deduct applicable platform fees, chargeback costs, or refund amounts from pending payouts.</p>
          <p><strong>Taxes:</strong> You are responsible for declaring and paying all applicable taxes on your income from Beme Market sales.</p>
        </Section>

        <Section title="7. Chargebacks & Disputes">
          <p>A chargeback occurs when a customer's bank reverses a payment. When a chargeback is filed against your store:</p>
          <ul>
            <li>The disputed amount is temporarily held from your balance</li>
            <li>You will be notified and asked to provide evidence (delivery proof, chat records, photos)</li>
            <li>Beme Market reviews the evidence and responds to the bank within required timeframes</li>
            <li>If the chargeback is found valid, the amount is refunded to the customer from your balance</li>
            <li>Excessive chargebacks (more than 2% of transactions) may result in store suspension</li>
          </ul>
          <p>Maintain delivery records, customer communications, and clear product descriptions to protect yourself in disputes.</p>
        </Section>

        <Section title="8. Store Verification">
          <p>Verification is optional but provides a trust badge on your store. To apply:</p>
          <ul>
            <li>Submit valid government-issued ID (Ghana Card, Passport, or Driver's License)</li>
            <li>Business registration documents (if applicable)</li>
            <li>A recent utility bill or bank statement (not older than 3 months)</li>
          </ul>
          <p><strong>Important:</strong> Submitting forged, altered, or fraudulent documents constitutes criminal fraud. All submitted documents are stored securely and reviewed by our trust & safety team. Verified status may be revoked if your conduct violates platform policies.</p>
        </Section>

        <Section title="9. Platform Rights & Enforcement">
          <p>Beme Market reserves the absolute right, without notice or liability, to:</p>
          <ul>
            <li><strong>Suspend or terminate</strong> any seller account for policy violations</li>
            <li><strong>Remove product listings</strong> that violate our prohibited items policy or contain inaccurate information</li>
            <li><strong>Freeze withdrawal requests</strong> pending fraud investigations</li>
            <li><strong>Reject or revoke</strong> verification applications</li>
            <li><strong>Limit</strong> selling privileges, payout amounts, or product quantities</li>
            <li><strong>Share seller information</strong> with law enforcement as required by law</li>
            <li><strong>Modify or remove</strong> product listings, pricing, or content that violates guidelines</li>
          </ul>
          <p>Beme Market's decisions on account actions are final. Appeals may be submitted to <a href="mailto:appeals@beme.market">appeals@beme.market</a> within 14 days of action.</p>
        </Section>

        <Section title="10. Intellectual Property">
          <p>You confirm that all product images, descriptions, and content you upload are owned by you or properly licensed. You grant Beme Market a non-exclusive, royalty-free license to use your product content for marketing and platform operations.</p>
          <p>Beme Market respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). Copyright infringement claims can be filed at <a href="mailto:legal@beme.market">legal@beme.market</a>.</p>
        </Section>

        <Section title="11. Amendments">
          <p>Beme Market may update these terms at any time. Continued use of seller features after updates constitutes acceptance. Material changes will be communicated via email and in-platform notifications at least 14 days before taking effect.</p>
        </Section>

        <Section title="12. Governing Law">
          <p>These terms are governed by the laws of the Republic of Ghana. Disputes shall be resolved in Ghanaian courts. By agreeing to these terms, you consent to the exclusive jurisdiction of Ghanaian courts for any disputes arising from your use of Beme Market seller services.</p>
        </Section>

        <div className="legal-footer-note">
          Questions about these terms? Contact us at <a href="mailto:legal@beme.market">legal@beme.market</a> or visit our Help Center.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="legal-section">
      <h2 className="legal-section-title">{title}</h2>
      <div className="legal-section-body">{children}</div>
    </div>
  );
}

