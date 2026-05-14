// src/components/getStore/BusinessTypeCard.jsx
export default function BusinessTypeCard({ id, icon, label, desc, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px 14px", borderRadius: 12, textAlign: "center", border: `2px solid ${selected ? "#046EF2" : "rgba(0,0,0,0.08)"}`, background: selected ? "rgba(4,110,242,0.05)" : "#fff", boxShadow: selected ? "0 0 0 4px rgba(4,110,242,0.12)" : "none", cursor: "pointer", transition: "all 0.14s", position: "relative", width: "100%" }}>
      {selected && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "#046EF2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>✓</div>}
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1D3B", marginBottom: 3, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#8B8FA8", lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

