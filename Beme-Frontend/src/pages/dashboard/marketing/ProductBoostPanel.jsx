/**
 * ProductBoostPanel.jsx
 * Product boost — pay via Paystack to feature products on marketplace homepage.
 * Same payment pattern as DashboardGift.jsx — uses /api/payments/initialize.
 */
import { useState } from "react";
import { BOOST_PRICING } from "../../../services/marketingService";

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
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z|M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  check:  "M20 6L9 17l-5-5",
  lock:   "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z|M7 11V7a5 5 0 0110 0v4",
  arrow:  "M5 12h14|M12 5l7 7-7 7",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  clock:  "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2",
  img:    "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l4-4 3 3 3-3 4 4z",
};

const DURATION_OPTS = [
  { days: 1,  label: "1 Day",    note: "Quick burst" },
  { days: 3,  label: "3 Days",   note: "Weekend push" },
  { days: 7,  label: "1 Week",   note: "Most popular" },
  { days: 14, label: "2 Weeks",  note: "Strong run" },
  { days: 30, label: "1 Month",  note: "Best value" },
];

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

export default function ProductBoostPanel({
  onBack, boosts, activeBoosts, boostsLoading,
  startBoostPayment, refreshBoosts, submitting, products,
}) {
  const [view, setView]         = useState("list"); // "list" | "create" | "redirecting"
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDays, setSelectedDays]       = useState(7);
  const [err, setErr]           = useState("");
  const [searchQuery, setSearchQuery]         = useState("");

  const filteredProducts = (products || []).filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBoost = async () => {
    setErr("");
    if (!selectedProduct) { setErr("Select a product to boost."); return; }
    try {
      const result = await startBoostPayment({
        productId:   selectedProduct.id,
        productName: selectedProduct.name,
        durationDays: selectedDays,
      });
      const url = result?.authorization_url || result?.data?.authorization_url;
      if (!url) throw new Error("No payment URL returned.");
      setView("redirecting");
      setTimeout(() => { window.location.href = url; }, 1400);
    } catch (e) {
      setErr(e.message || "Failed to start payment.");
    }
  };

  // ── REDIRECTING ──
  if (view === "redirecting") {
    return (
      <div>
        <div className="sd-panel" style={{ textAlign:"center", padding:"60px 28px" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--sd-accent-dim)",
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <Ico d={IC.arrow} size={28} color="var(--sd-accent)" sw={2} />
          </div>
          <h2 style={{ fontSize:18, fontWeight:800, color:"var(--sd-text)", marginBottom:8, letterSpacing:"-0.02em" }}>
            Redirecting to Paystack…
          </h2>
          <p style={{ fontSize:13, color:"var(--sd-muted)", marginBottom:20 }}>
            Completing your boost payment for <strong>{selectedProduct?.name}</strong>. Please do not close this tab.
          </p>
          <div style={{ width:32, height:32, border:"3px solid var(--sd-accent-dim)",
            borderTopColor:"var(--sd-accent)", borderRadius:"50%", margin:"0 auto",
            animation:"sd-spin 0.7s linear infinite" }} />
        </div>
      </div>
    );
  }

  // ── CREATE VIEW ──
  if (view === "create") {
    const priceGHS = BOOST_PRICING[selectedDays] || 0;
    return (
      <div>
        <button className="sd-modal-back-btn" onClick={() => setView("list")}>
          <Ico d={IC.back} size={13} /> Back to Boosts
        </button>
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={IC.rocket} size={14} color="var(--sd-accent)" /> Boost a Product
            </span>
          </div>

          {/* Step 1 — Pick product */}
          <div style={{ marginBottom:20 }}>
            <div className="sd-label" style={{ marginBottom:8 }}>Step 1 — Choose a Product</div>
            <input className="sd-input" placeholder="Search products…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom:8 }} />
            <div style={{ maxHeight:220, overflowY:"auto", border:"1px solid var(--sd-border)",
              borderRadius:8, padding:8, display:"flex", flexDirection:"column", gap:6 }}>
              {filteredProducts.length === 0
                ? <div style={{ padding:12, fontSize:13, color:"var(--sd-muted)", textAlign:"center" }}>No products found.</div>
                : filteredProducts.map((p) => {
                  const sel = selectedProduct?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedProduct(p)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                        borderRadius:8, border:`1.5px solid ${sel ? "var(--sd-accent)" : "transparent"}`,
                        background: sel ? "var(--sd-accent-dim)" : "transparent", cursor:"pointer",
                        textAlign:"left", width:"100%", fontFamily:"inherit",
                        transition:"all 0.12s" }}>
                      {(p.images?.[0] || p.imageUrl)
                        ? <img src={p.images?.[0] || p.imageUrl} alt={p.name}
                            style={{ width:36, height:36, borderRadius:6, objectFit:"cover", flexShrink:0 }} />
                        : <div style={{ width:36, height:36, borderRadius:6, background:"var(--sd-border)",
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <Ico d={IC.img} size={16} color="var(--sd-muted)" />
                          </div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--sd-text)",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"var(--sd-muted)" }}>GHS {Number(p.price||0).toFixed(2)}</div>
                      </div>
                      {sel && <Ico d={IC.check} size={14} color="var(--sd-accent)" />}
                    </button>
                  );
                })
              }
            </div>
          </div>

          {/* Step 2 — Duration */}
          <div style={{ marginBottom:20 }}>
            <div className="sd-label" style={{ marginBottom:8 }}>Step 2 — Choose Duration</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:8 }}>
              {DURATION_OPTS.map((opt) => {
                const sel = selectedDays === opt.days;
                return (
                  <button key={opt.days} onClick={() => setSelectedDays(opt.days)}
                    style={{ padding:"12px 8px", borderRadius:10, textAlign:"center",
                      border:`2px solid ${sel ? "var(--sd-accent)" : "var(--sd-border)"}`,
                      background: sel ? "var(--sd-accent-dim)" : "transparent", cursor:"pointer",
                      fontFamily:"inherit", transition:"all 0.12s" }}>
                    <div style={{ fontSize:13, fontWeight:800,
                      color: sel ? "var(--sd-accent)" : "var(--sd-text)" }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:"var(--sd-muted)", marginTop:2 }}>{opt.note}</div>
                    <div style={{ fontSize:14, fontWeight:800, marginTop:6,
                      color: sel ? "var(--sd-accent)" : "var(--sd-text)" }}>
                      GHS {BOOST_PRICING[opt.days]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {selectedProduct && (
            <div style={{ padding:"14px 16px", borderRadius:10, background:"var(--sd-bg)",
              border:"1px solid var(--sd-border)", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sd-muted)",
                textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Order Summary</div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                <span style={{ color:"var(--sd-text2)" }}>{selectedProduct.name}</span>
                <span style={{ fontWeight:600 }}>Boost</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                <span style={{ color:"var(--sd-text2)" }}>Duration</span>
                <span style={{ fontWeight:600 }}>{selectedDays} day{selectedDays !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ borderTop:"1px solid var(--sd-border)", paddingTop:8, marginTop:8,
                display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Total</span>
                <span style={{ fontWeight:800, fontSize:16, color:"var(--sd-accent)" }}>GHS {priceGHS}</span>
              </div>
            </div>
          )}

          {err && <div className="sd-modal-err">{err}</div>}

          <button className="sd-btn sd-btn-primary"
            style={{ width:"100%", justifyContent:"center", padding:12 }}
            onClick={handleBoost} disabled={submitting || !selectedProduct}>
            {submitting
              ? "Processing…"
              : <><Ico d={IC.rocket} size={14} /> Pay GHS {priceGHS} to Boost</>}
          </button>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            marginTop:10, fontSize:12, color:"var(--sd-muted)" }}>
            <Ico d={IC.lock} size={13} color="var(--sd-muted)" />
            Secured by Paystack
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div>
      <button className="sd-modal-back-btn" onClick={onBack}>
        <Ico d={IC.back} size={13} /> Back to Marketing
      </button>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div className="sd-page-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Ico d={IC.rocket} size={14} color="var(--sd-accent)" /> Product Boosts
          </div>
          <div className="sd-page-sub">
            {activeBoosts.length} active boost{activeBoosts.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
          <Ico d={IC.rocket} size={13} /> Boost a Product
        </button>
      </div>

      {/* Benefits */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10, marginBottom:16 }}>
        {[
          { icon:IC.star,  label:"Homepage Feature",   desc:"Your product appears in the featured section" },
          { icon:IC.arrow, label:"Search Priority",     desc:"Rank higher in marketplace search results" },
          { icon:IC.check, label:"Real-time tracking",  desc:"Live performance metrics in Analytics Pro" },
        ].map((b, i) => (
          <div key={i} style={{ padding:"14px", borderRadius:12, background:"var(--sd-white)",
            border:"1px solid var(--sd-border)" }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"var(--sd-accent-dim)",
              display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
              <Ico d={b.icon} size={16} color="var(--sd-accent)" />
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--sd-text)", marginBottom:3 }}>{b.label}</div>
            <div style={{ fontSize:11, color:"var(--sd-muted)", lineHeight:1.5 }}>{b.desc}</div>
          </div>
        ))}
      </div>

      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title">Boost History</span>
          <button className="sd-btn-link" onClick={refreshBoosts} style={{ fontSize:12 }}>
            <Ico d={IC.arrow} size={11} /> Refresh
          </button>
        </div>
        {boostsLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : boosts.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"var(--sd-accent-dim)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.rocket} size={24} color="var(--sd-accent)" />
                </div>
                <div className="sd-empty-title">No boosts yet</div>
                <div className="sd-empty-text">Boost a product to get it featured on the marketplace homepage.</div>
                <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setView("create")}>
                  <Ico d={IC.rocket} size={13} /> Boost a Product
                </button>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr><th>Product</th><th>Duration</th><th>Amount Paid</th><th>Expires</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {boosts.map((b) => {
                      const exp = b.expiresAt?.toDate ? b.expiresAt.toDate() : new Date(b.expiresAt);
                      const isActive = exp > new Date() && b.status !== "cancelled";
                      return (
                        <tr key={b.id}>
                          <td style={{ fontWeight:600 }}>{b.productName || b.productId?.slice(0,10)}</td>
                          <td style={{ color:"var(--sd-muted)", fontSize:12 }}>
                            {b.durationDays} day{b.durationDays !== 1 ? "s" : ""}
                          </td>
                          <td style={{ fontWeight:700 }}>GHS {Number(b.amountPaid||0).toFixed(0)}</td>
                          <td style={{ color:"var(--sd-muted)", fontSize:12 }}>{fmtDate(b.expiresAt)}</td>
                          <td>
                            {isActive
                              ? <span className="sd-badge sd-badge-green">Active</span>
                              : <span className="sd-badge sd-badge-gray">Expired</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}