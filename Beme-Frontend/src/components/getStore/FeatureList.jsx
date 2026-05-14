// src/components/getStore/FeatureList.jsx
// Renders a list of plan features with check / cross icons

export function FeatureList({ features = [], color = "#046EF2", showAll = false }) {
  const visible = showAll ? features : features.slice(0, 6);

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
      {visible.map((f, i) => {
        const enabled = typeof f === "string" ? true : f.ok !== false;
        const label   = typeof f === "string" ? f : f.label || f.text || f;
        return (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: enabled ? "#374151" : "#C4C9D4" }}>
            {enabled
              ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )
            }
            {label}
          </li>
        );
      })}
    </ul>
  );
}

