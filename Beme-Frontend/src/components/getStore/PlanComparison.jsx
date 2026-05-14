// src/components/getStore/PlanComparison.jsx
// Full feature comparison table across all 3 plans

const ROWS = [
  { label: "Products",          basic: "25",   standard: "500",  pro: "Unlimited" },
  { label: "Store Themes",      basic: "Basic",standard: "Premium", pro: "Premium+" },
  { label: "Live Chat",         basic: false,  standard: true,   pro: true },
  { label: "Discount Codes",    basic: false,  standard: true,   pro: true },
  { label: "Product Boosts",    basic: false,  standard: "5/mo", pro: "20/mo" },
  { label: "Verified Badge",    basic: false,  standard: true,   pro: "Pro Badge" },
  { label: "Analytics",         basic: "Basic",standard: "Advanced", pro: "Advanced" },
  { label: "AI Captions",       basic: false,  standard: false,  pro: true },
  { label: "Custom Domain",     basic: false,  standard: false,  pro: true },
  { label: "Loyalty Rewards",   basic: false,  standard: false,  pro: true },
  { label: "Priority Support",  basic: false,  standard: false,  pro: true },
  { label: "Homepage Ranking",  basic: false,  standard: false,  pro: true },
];

function Cell({ value }) {
  if (value === true) return <span style={{ color: "#22C55E", fontWeight: 700, fontSize: 16 }}>✓</span>;
  if (value === false) return <span style={{ color: "#D1D5DB", fontSize: 16 }}>—</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</span>;
}

export function PlanComparison() {
  const th = { padding: "10px 16px", fontSize: 12, fontWeight: 800, textAlign: "center", color: "#fff", letterSpacing: "0.04em" };
  const td = { padding: "12px 16px", fontSize: 13, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.05)" };

  return (
    <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left", background: "#1A1D3B", borderRadius: "14px 0 0 0" }}>Feature</th>
            <th style={{ ...th, background: "#6B7280" }}>Basic</th>
            <th style={{ ...th, background: "#046EF2" }}>Standard</th>
            <th style={{ ...th, background: "#7C3AED", borderRadius: "0 14px 0 0" }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
              <td style={{ ...td, textAlign: "left", fontWeight: 600, color: "#1A1D3B" }}>{row.label}</td>
              <td style={td}><Cell value={row.basic} /></td>
              <td style={td}><Cell value={row.standard} /></td>
              <td style={td}><Cell value={row.pro} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

