// src/components/getStore/ProgressBar.jsx
export default function ProgressBar({ current = 0, total = 100, label, color = "#046EF2", showPercent = false }) {
  const pct      = Math.min(100, total > 0 ? Math.round((current / total) * 100) : 0);
  const barColor = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : color;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
        {label && <span style={{ color: "#6B7280", fontWeight: 600 }}>{label}</span>}
        <span style={{ fontWeight: 700, color: pct >= 90 ? "#EF4444" : "#1A1D3B" }}>
          {showPercent ? `${pct}%` : `${current} / ${total === 99999 ? "∞" : total}`}
        </span>
      </div>
      <div style={{ height: 7, background: "rgba(0,0,0,0.08)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 100, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

