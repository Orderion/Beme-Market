/**
 * ReferralPanel.jsx
 * Referral system — unique link, referred sellers list, total earned.
 */
import { useState } from "react";

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
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
  copy:   "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z|M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  check:  "M20 6L9 17l-5-5",
  share:  "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8|M16 6l-4-4-4 4|M12 2v13",
  dollar: "M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  trend:  "M23 6L13.5 15.5 8.5 10.5 1 18|M17 6h6v6",
  clock:  "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

export default function ReferralPanel({
  onBack, referrals, referralCode, referralLink,
  referralsLoading, totalReferralEarned,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleShare = () => {
    if (navigator.share && referralLink) {
      navigator.share({
        title: "Join me on Beme Market",
        text:  "Start your free online store on Beme Market — Ghana's favourite marketplace.",
        url:   referralLink,
      }).catch(() => {});
    } else {
      handleCopy(referralLink || "");
    }
  };

  const pending   = referrals.filter((r) => r.status === "pending").length;
  const activated = referrals.filter((r) => r.status === "activated").length;

  return (
    <div>
      <button className="sd-modal-back-btn" onClick={onBack}>
        <Ico d={IC.back} size={13} /> Back to Marketing
      </button>

      <div style={{ marginBottom:16 }}>
        <div className="sd-page-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Ico d={IC.users} size={14} color="#EF4444" /> Referral System
        </div>
        <div className="sd-page-sub">Earn rewards for every seller you bring to Beme Market</div>
      </div>

      {/* Stats */}
      <div className="sd-stats-grid" style={{ marginBottom:16 }}>
        {[
          { label:"Total Earned", value:`GHS ${totalReferralEarned.toFixed(2)}`, color:"#22C55E" },
          { label:"Activated",    value:activated,                                color:"var(--sd-accent)" },
          { label:"Pending",      value:pending,                                  color:"#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="sd-stat-card">
            <div className="sd-stat-label">{s.label}</div>
            <div className="sd-stat-value" style={{ fontSize:22, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head">
          <span className="sd-panel-title">Your Referral Link</span>
        </div>
        {referralLink ? (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <div style={{ flex:1, padding:"10px 14px", borderRadius:8,
                background:"var(--sd-bg)", border:"1px solid var(--sd-border)",
                fontSize:13, color:"var(--sd-text)", fontWeight:500,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {referralLink}
              </div>
              <button className="sd-btn sd-btn-secondary sd-btn-sm"
                onClick={() => handleCopy(referralLink)} style={{ flexShrink:0 }}>
                <Ico d={IC.copy} size={13} /> {copied ? "Copied!" : "Copy"}
              </button>
              <button className="sd-btn sd-btn-primary sd-btn-sm"
                onClick={handleShare} style={{ flexShrink:0 }}>
                <Ico d={IC.share} size={13} /> Share
              </button>
            </div>
            {copied && (
              <div style={{ fontSize:12, color:"var(--sd-success)", fontWeight:700,
                display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <Ico d={IC.check} size={12} color="var(--sd-success)" /> Link copied to clipboard!
              </div>
            )}
            <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--sd-accent-dim)",
              border:"1px solid var(--sd-accent-border)", fontSize:12, color:"var(--sd-accent)", fontWeight:600 }}>
              Share this link on WhatsApp, Instagram or TikTok. When someone signs up and makes their first sale,
              you earn a wallet credit automatically.
            </div>
          </>
        ) : (
          <div style={{ fontSize:13, color:"var(--sd-muted)" }}>Generating your referral link…</div>
        )}
      </div>

      {/* How it works */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head">
          <span className="sd-panel-title">How It Works</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { icon:IC.share,  step:"1", text:"Share your unique referral link with friends, family, or on social media." },
            { icon:IC.users,  step:"2", text:"They sign up as a seller on Beme Market using your link." },
            { icon:IC.trend,  step:"3", text:"Once they make their first sale, your referral is activated." },
            { icon:IC.dollar, step:"4", text:"You receive a wallet credit — redeemable on your next subscription or withdrawal." },
          ].map((s) => (
            <div key={s.step} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--sd-accent-dim)",
                border:"1px solid var(--sd-accent-border)", display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0, fontSize:12, fontWeight:800, color:"var(--sd-accent)" }}>
                {s.step}
              </div>
              <div style={{ fontSize:13, color:"var(--sd-text2)", lineHeight:1.6, paddingTop:4 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals table */}
      <div className="sd-panel">
        <div className="sd-panel-head"><span className="sd-panel-title">Referred Sellers</span></div>
        {referralsLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height:52, marginBottom:10, borderRadius:8 }} />)
          : referrals.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"rgba(239,68,68,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.users} size={24} color="#EF4444" />
                </div>
                <div className="sd-empty-title">No referrals yet</div>
                <div className="sd-empty-text">Share your link to start earning rewards from every seller you bring in.</div>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr><th>Seller</th><th>Date Referred</th><th>Reward</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight:600 }}>
                          {r.referredShopName || r.referredEmail || r.referredUid?.slice(0, 10) + "…"}
                        </td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ fontWeight:700, color:"#22C55E" }}>
                          {r.rewardAmount ? `GHS ${r.rewardAmount.toFixed(2)}` : "Pending"}
                        </td>
                        <td>
                          {r.status === "activated"
                            ? <span className="sd-badge sd-badge-green">Activated</span>
                            : <span className="sd-badge sd-badge-yellow">Pending</span>}
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