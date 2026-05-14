// src/components/getStore/SurveyStep.jsx
export function SurveyStep({ step, totalSteps, title, subtitle, children, onNext, onBack, nextLabel = "Continue →", disabled = false, loading = false }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 100, background: i < step ? "#046EF2" : "rgba(0,0,0,0.1)", transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8FA8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Step {step} of {totalSteps}</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 800, color: "#111", letterSpacing: "-0.04em", marginBottom: 6 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{subtitle}</p>}
      </div>
      <div style={{ marginBottom: 32 }}>{children}</div>
      <div style={{ display: "flex", gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ flex: 1, padding: "13px 0", background: "transparent", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#374151", fontFamily: "Manrope,sans-serif" }}>← Back</button>}
        <button onClick={onNext} disabled={disabled || loading} style={{ flex: onBack ? 2 : 1, padding: "13px 0", background: disabled ? "#E5E7EB" : "#046EF2", color: disabled ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.12s", fontFamily: "Manrope,sans-serif" }}>
          {loading ? "Saving…" : nextLabel}
        </button>
      </div>
    </div>
  );
}
export default SurveyStep;

