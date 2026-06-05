/**
 * LoyaltyRewardsPanel.jsx
 * Loyalty rewards configuration and customer points leaderboard.
 */
import { useState, useEffect } from "react";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  back:   "M19 12H5|M12 5l-7 7 7 7",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  check:  "M20 6L9 17l-5-5",
  save:   "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z|M17 21v-8H7v8|M7 3v5h8",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  trophy: "M6 9H4.5a2.5 2.5 0 010-5H6|M18 9h1.5a2.5 2.5 0 000-5H18|M4 22h16|M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22|M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22|M18 2H6v7a6 6 0 0012 0V2z",
  user:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2|M12 11a4 4 0 100-8 4 4 0 000 8z",
};

export default function LoyaltyRewardsPanel({
  onBack, loyaltyConfig, loyaltyLeaderboard, loyaltyLoading,
  saveLoyalty, submitting,
}) {
  const [form, setForm] = useState({
    enabled:         true,
    earnRate:        1,
    redeemRate:      0.01,
    minRedeemPoints: 100,
  });
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState("");

  // Populate form from loaded config
  useEffect(() => {
    if (loyaltyConfig) {
      setForm({
        enabled:         loyaltyConfig.enabled ?? true,
        earnRate:        loyaltyConfig.earnRate || 1,
        redeemRate:      loyaltyConfig.redeemRate || 0.01,
        minRedeemPoints: loyaltyConfig.minRedeemPoints || 100,
      });
    }
  }, [loyaltyConfig]);

  const upd = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
  };

  const handleSave = async () => {
    setErr("");
    if (Number(form.earnRate) <= 0)    { setErr("Earn rate must be greater than 0."); return; }
    if (Number(form.redeemRate) <= 0)  { setErr("Redeem rate must be greater than 0."); return; }
    try {
      await saveLoyalty({
        enabled:         form.enabled,
        earnRate:        Number(form.earnRate),
        redeemRate:      Number(form.redeemRate),
        minRedeemPoints: Number(form.minRedeemPoints),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message || "Failed to save settings.");
    }
  };

  // Preview calculations
  const exampleSpend   = 100;
  const examplePoints  = Math.floor(exampleSpend * Number(form.earnRate || 1));
  const redeemValue    = (examplePoints * Number(form.redeemRate || 0.01)).toFixed(2);
  const minRedeemGHS   = (Number(form.minRedeemPoints || 100) * Number(form.redeemRate || 0.01)).toFixed(2);

  return (
    <div>
      <button className="sd-modal-back-btn" onClick={onBack}>
        <Ico d={IC.back} size={13} /> Back to Marketing
      </button>

      <div style={{ marginBottom:16 }}>
        <div className="sd-page-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Ico d={IC.star} size={14} color="#EC4899" /> Loyalty Rewards
        </div>
        <div className="sd-page-sub">Reward repeat customers and build lasting relationships</div>
      </div>

      {/* Config panel */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head">
          <span className="sd-panel-title">Loyalty Settings</span>
          {/* Enable toggle */}
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"var(--sd-text)" }}>
              {form.enabled ? "Enabled" : "Disabled"}
            </span>
            <div onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              style={{ width:40, height:22, borderRadius:100, position:"relative", cursor:"pointer",
                background: form.enabled ? "var(--sd-accent)" : "var(--sd-border)",
                transition:"background 0.2s" }}>
              <div style={{ position:"absolute", top:2, left: form.enabled ? 20 : 2, width:18, height:18,
                borderRadius:"50%", background:"#fff", transition:"left 0.2s",
                boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
            </div>
          </label>
        </div>

        {!form.enabled && (
          <div className="sd-info-panel warning" style={{ marginBottom:16 }}>
            <Ico d={IC.info} size={16} color="var(--sd-warning)" />
            <span className="sd-info-text">Loyalty rewards are disabled. Customers will not earn or redeem points.</span>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16,
          opacity: form.enabled ? 1 : 0.5, pointerEvents: form.enabled ? "auto" : "none" }}>
          <div className="sd-form-group" style={{ margin:0 }}>
            <label className="sd-label">Points earned per GHS 1 spent</label>
            <input className="sd-input" type="number" min="0.1" step="0.1"
              value={form.earnRate} onChange={upd("earnRate")} />
            <div style={{ fontSize:11, color:"var(--sd-muted)", marginTop:4 }}>
              e.g. 1 = 1 point per GHS 1
            </div>
          </div>
          <div className="sd-form-group" style={{ margin:0 }}>
            <label className="sd-label">GHS value of 1 point</label>
            <input className="sd-input" type="number" min="0.001" step="0.001"
              value={form.redeemRate} onChange={upd("redeemRate")} />
            <div style={{ fontSize:11, color:"var(--sd-muted)", marginTop:4 }}>
              e.g. 0.01 = 100 pts = GHS 1
            </div>
          </div>
          <div className="sd-form-group" style={{ margin:0 }}>
            <label className="sd-label">Minimum points to redeem</label>
            <input className="sd-input" type="number" min="1"
              value={form.minRedeemPoints} onChange={upd("minRedeemPoints")} />
            <div style={{ fontSize:11, color:"var(--sd-muted)", marginTop:4 }}>
              = GHS {minRedeemGHS} minimum redemption
            </div>
          </div>
        </div>

        {/* Live preview */}
        {form.enabled && (
          <div style={{ padding:"14px 16px", borderRadius:10, background:"var(--sd-accent-dim)",
            border:"1px solid var(--sd-accent-border)", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--sd-accent)",
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
              Live Preview
            </div>
            <div style={{ fontSize:13, color:"var(--sd-text)", lineHeight:1.7 }}>
              A customer who spends <strong>GHS {exampleSpend}</strong> earns{" "}
              <strong style={{ color:"var(--sd-accent)" }}>{examplePoints} points</strong>{" "}
              worth <strong>GHS {redeemValue}</strong> off their next purchase.
            </div>
          </div>
        )}

        {err && <div className="sd-modal-err">{err}</div>}
        {saved && (
          <div style={{ padding:"12px 14px", borderRadius:8, background:"var(--sd-success-bg)",
            color:"var(--sd-success)", fontSize:13, fontWeight:700, marginBottom:14,
            display:"flex", alignItems:"center", gap:8 }}>
            <Ico d={IC.check} size={14} color="var(--sd-success)" /> Settings saved!
          </div>
        )}
        <button className="sd-btn sd-btn-primary"
          style={{ display:"flex", alignItems:"center", gap:6 }}
          onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving…" : <><Ico d={IC.save} size={14} /> Save Settings</>}
        </button>
      </div>

      {/* How it works */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head"><span className="sd-panel-title">How Customers Experience It</span></div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            "Customer completes an order → points are automatically added to their account for your store.",
            "On their next order, they see their points balance at checkout and can apply it as a discount.",
            "You set the earn rate and redeem value — customers only see the GHS discount, not the raw points maths.",
            "Points are store-specific — your loyalty programme is yours alone, not shared with other sellers.",
          ].map((txt, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(236,72,153,0.08)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                fontSize:11, fontWeight:800, color:"#EC4899", marginTop:1 }}>
                {i+1}
              </div>
              <div style={{ fontSize:13, color:"var(--sd-text2)", lineHeight:1.65 }}>{txt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Ico d={IC.trophy} size={14} color="#F59E0B" /> Top Loyalty Customers
          </span>
        </div>
        {loyaltyLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : loyaltyLeaderboard.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"rgba(236,72,153,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.star} size={24} color="#EC4899" />
                </div>
                <div className="sd-empty-title">No loyalty data yet</div>
                <div className="sd-empty-text">Enable loyalty rewards and customer points will appear here after their first order.</div>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr><th>#</th><th>Customer</th><th>Points Balance</th><th>Total Earned</th><th>Total Redeemed</th></tr>
                  </thead>
                  <tbody>
                    {loyaltyLeaderboard.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight:800, color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#B45309" : "var(--sd-muted)" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                        </td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:"50%",
                              background:"rgba(236,72,153,0.1)", display:"flex", alignItems:"center",
                              justifyContent:"center", fontSize:12, fontWeight:700, color:"#EC4899", flexShrink:0 }}>
                              <Ico d={IC.user} size={14} color="#EC4899" />
                            </div>
                            <span style={{ fontWeight:600 }}>{c.customerName || c.customerId?.slice(0,10) + "…"}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight:700, color:"var(--sd-accent)" }}>
                          {(c.pointsBalance || 0).toLocaleString()} pts
                        </td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                          {(c.totalEarned || 0).toLocaleString()} pts
                        </td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                          {(c.totalRedeemed || 0).toLocaleString()} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}