// src/components/getStore/PricingCard.jsx
export function PricingCard({ plan, selected, onSelect, onAction }) {
  const colors = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };
  const color  = colors[plan.id] || "#046EF2";
  const isSelected = selected === plan.id;

  return (
    <div
      onClick={() => onSelect?.(plan.id)}
      style={{
        border: `2px solid ${isSelected ? color : "rgba(0,0,0,0.08)"}`,
        borderRadius: 14, padding: "24px 20px", background: "#fff",
        cursor: "pointer", position: "relative", transition: "all 0.15s",
        boxShadow: isSelected ? `0 0 0 4px ${color}22` : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {plan.popular && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap" }}>
          Most Popular
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.name}</div>
      <div style={{ marginBottom: 16 }}>
        {plan.price === 0
          ? <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>Free</span>
          : <><span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>GHS {plan.price}</span><span style={{ fontSize: 13, color: "#6B7280" }}>/mo</span></>
        }
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>{plan.tagline}</div>
      {onAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction(plan.id); }}
          style={{ width: "100%", padding: "10px 0", background: isSelected ? color : "transparent", color: isSelected ? "#fff" : color, border: `2px solid ${color}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "Manrope, sans-serif" }}
        >
          {plan.cta}
        </button>
      )}
    </div>
  );
}

