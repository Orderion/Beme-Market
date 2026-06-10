// src/pages/dashboard/marketing/ReferralPanel.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useSellerAuth } from "../../../hooks/useSellerAuth";
import {
  getOrCreateReferralCode, getSellerReferrals, getReferralBalance,
  REFERRAL_REWARDS, REFERRAL_MIN_WITHDRAW,
} from "../../../services/referralService";

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
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  gift:   "M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

export default function ReferralPanel({ onBack }) {
  const { user }      = useAuth();
  const { shop }      = useSellerAuth();
  const [code,        setCode]        = useState("");
  const [link,        setLink]        = useState("");
  const [referrals,   setReferrals]   = useState([]);
  const [balance,     setBalance]     = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const [c, refs, bal] = await Promise.all([
          getOrCreateReferralCode(user.uid, shop?.shopName || ""),
          getSellerReferrals(user.uid),
          getReferralBalance(user.uid),
        ]);
        setCode(c || "");
        setLink(c ? `https://bememarket.store/store-onboarding?ref=${c}` : "");
        setReferrals(refs);
        setBalance(bal);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.uid]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleShare = () => {
    if (navigator.share && link) {
      navigator.share({ title:"Join me on Beme Market", text:"Start your free online store!", url:link }).catch(()=>{});
    } else {
      handleCopy(link);
    }
  };

  const activated = referrals.filter(r => r.status === "activated").length;
  const pending   = referrals.filter(r => r.status === "pending").length;
  const total     = referrals.reduce((s, r) => s + (r.rewardAmount || 0), 0);

  return (
    <div>
      <button className="sd-modal-back-btn" onClick={onBack}>
        <Ico d={IC.back} size={13} /> Back to Marketing
      </button>

      <div style={{ marginBottom:16 }}>
        <div className="sd-page-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Ico d={IC.users} size={14} color="var(--sd-accent)" /> Referral System
        </div>
        <div className="sd-page-sub">Earn GHS 1–7 for every seller you bring to Beme Market</div>
      </div>

      {/* Stats */}
      <div className="sd-stats-grid" style={{ marginBottom:16 }}>
        {[
          { label:"Balance",    value:`GHS ${balance.toFixed(2)}`, color:"#22C55E" },
          { label:"Activated",  value:activated,                    color:"var(--sd-accent)" },
          { label:"Pending",    value:pending,                      color:"#F59E0B" },
        ].map(s => (
          <div key={s.label} className="sd-stat-card">
            <div className="sd-stat-label">{s.label}</div>
            <div className="sd-stat-value" style={{ fontSize:22, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head"><span className="sd-panel-title">Your Referral Link</span></div>
        {loading ? (
          <div className="sd-skeleton" style={{ height:40, borderRadius:8 }} />
        ) : link ? (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{ flex:1, padding:"10px 14px", borderRadius:8, background:"var(--sd-bg)",
                border:"1px solid var(--sd-border)", fontSize:12, color:"var(--sd-text)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:600 }}>
                {link}
              </div>
              <button className="sd-btn sd-btn-secondary sd-btn-sm" onClick={() => handleCopy(link)}>
                <Ico d={IC.copy} size={13} /> {copied ? "Copied!" : "Copy"}
              </button>
              <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={handleShare}>
                <Ico d={IC.share} size={13} /> Share
              </button>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12,
              color:"var(--sd-muted)", marginBottom:10 }}>
              Code: <code style={{ fontWeight:800, color:"var(--sd-accent)",
                background:"var(--sd-accent-dim)", padding:"2px 8px", borderRadius:5,
                letterSpacing:"0.08em", border:"1px solid var(--sd-accent-border)" }}>{code}</code>
              <button onClick={() => handleCopy(code)} style={{ background:"none", border:"none",
                cursor:"pointer", color:"var(--sd-muted)", padding:2, display:"flex" }}>
                <Ico d={IC.copy} size={11} />
              </button>
            </div>
            {balance >= REFERRAL_MIN_WITHDRAW && (
              <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(34,197,94,0.08)",
                border:"1px solid rgba(34,197,94,0.2)", fontSize:13, color:"#15803d", fontWeight:700,
                display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <Ico d={IC.dollar} size={14} color="#15803d" />
                GHS {balance.toFixed(2)} available — go to Withdrawals to cash out
              </div>
            )}
            <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--sd-accent-dim)",
              border:"1px solid var(--sd-accent-border)", fontSize:12, color:"var(--sd-accent)", fontWeight:600 }}>
              Share on WhatsApp or Instagram. When someone signs up and subscribes to a paid plan, you earn automatically.
            </div>
          </>
        ) : (
          <div style={{ fontSize:13, color:"var(--sd-muted)" }}>Generating your referral link…</div>
        )}
      </div>

      {/* Reward tiers */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head"><span className="sd-panel-title">Reward Tiers</span></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[
            { plan:"Starter", amount:REFERRAL_REWARDS.starter, color:"#6366F1" },
            { plan:"Growth",  amount:REFERRAL_REWARDS.growth,  color:"#046EF2" },
            { plan:"Pro",     amount:REFERRAL_REWARDS.pro,     color:"#7c3aed" },
          ].map(t => (
            <div key={t.plan} style={{ padding:"14px 12px", borderRadius:10, textAlign:"center",
              border:`1.5px solid ${t.color}22`, background:`${t.color}08` }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--sd-muted)",
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{t.plan}</div>
              <div style={{ fontSize:20, fontWeight:900, color:t.color }}>GHS {t.amount}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:"var(--sd-muted)", marginTop:10, lineHeight:1.6 }}>
          Min. withdrawal: GHS {REFERRAL_MIN_WITHDRAW} · Paid plans only (Starter, Growth, Pro)
        </div>
      </div>

      {/* How it works */}
      <div className="sd-panel" style={{ marginBottom:14 }}>
        <div className="sd-panel-head"><span className="sd-panel-title">How It Works</span></div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { step:"1", text:"Share your referral link or code on WhatsApp, Instagram, or TikTok." },
            { step:"2", text:"They sign up as a seller and enter your code during store onboarding." },
            { step:"3", text:"They subscribe to any paid plan (Starter, Growth, or Pro)." },
            { step:"4", text:"You automatically earn GHS 1, 3, or 7 depending on their plan." },
          ].map(s => (
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
        {loading
          ? [1,2,3].map(i => <div key={i} className="sd-skeleton" style={{ height:48, marginBottom:8, borderRadius:8 }} />)
          : referrals.length === 0
            ? (
              <div className="sd-empty">
                <div style={{ width:48, height:48, borderRadius:12, background:"var(--sd-accent-dim)",
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <Ico d={IC.users} size={24} color="var(--sd-accent)" />
                </div>
                <div className="sd-empty-title">No referrals yet</div>
                <div className="sd-empty-text">Share your link to start earning rewards.</div>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr><th>Seller</th><th>Plan</th><th>Date</th><th>Reward</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {referrals.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight:600 }}>
                          {r.referredEmail || r.referredUid?.slice(0,10) + "…"}
                        </td>
                        <td style={{ textTransform:"capitalize", fontSize:12 }}>{r.planId || "—"}</td>
                        <td style={{ color:"var(--sd-muted)", fontSize:12 }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ fontWeight:700, color:"#22C55E" }}>
                          {r.rewardAmount ? `GHS ${r.rewardAmount.toFixed(2)}` : "—"}
                        </td>
                        <td>
                          <span className={`sd-badge ${r.status === "activated" ? "sd-badge-green" : "sd-badge-yellow"}`}>
                            {r.status === "activated" ? "Paid" : "Pending"}
                          </span>
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