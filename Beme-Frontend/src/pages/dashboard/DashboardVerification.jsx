import { useState, useEffect } from "react";
import { doc, addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

/* ─── SVG icons ─── */
function Ico({ d, size=20, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg}/>)}
    </svg>
  );
}
const IC = {
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  shieldOk: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
  lock:     "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z|M7 11V7a5 5 0 0110 0v4",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trend:    "M23 6L13.5 15.5 8.5 10.5 1 18|M17 6h6v6",
  dollar:   "M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2|M12 11a4 4 0 100-8 4 4 0 000 8z",
  file:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8",
  check:    "M20 6L9 17l-5-5",
  clock:    "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2",
  info:     "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
};

const BENEFITS = [
  {
    icon:  IC.shieldOk,
    color: "#046EF2",
    title: "Build Trust",
    desc:  "Verified badge appears on your store page and all your product listings.",
  },
  {
    icon:  IC.trend,
    color: "#22C55E",
    title: "More Sales",
    desc:  "Verified sellers rank higher in search results and get featured more often.",
  },
  {
    icon:  IC.dollar,
    color: "#F59E0B",
    title: "Higher Limits",
    desc:  "Access higher weekly withdrawal limits and priority payout processing.",
  },
];

const DOCS_NEEDED = [
  { icon: IC.user,  label:"Government-issued ID",  desc:"Ghana Card, Passport, or Driver's Licence"  },
  { icon: IC.file,  label:"Business registration",  desc:"Optional but speeds up verification"         },
  { icon: IC.file,  label:"Proof of address",        desc:"Utility bill or bank statement (3 months)"  },
];

export default function DashboardVerification() {
  const { user } = useAuth();
  const { shop } = useSellerAuth();

  const [request, setRequest] = useState(null);   // existing request if any
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent,    setSent]    = useState(false);

  const isVerified = !!(shop?.verified || shop?.verifiedBadge);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getDocs(query(
      collection(db, "verificationRequests"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1),
    )).then(snap => {
      if (!snap.empty) setRequest({ id:snap.docs[0].id, ...snap.docs[0].data() });
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [user?.uid]);

  const handleSubmit = async () => {
    if (!user?.uid) return;
    setSending(true);
    try {
      await addDoc(collection(db, "verificationRequests"), {
        sellerId:  user.uid,
        shopId:    shop?.id || null,
        shopName:  shop?.shopName || "",
        message:   message.trim(),
        status:    "pending",
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setMessage("");
      setRequest({ status:"pending" });
    } catch (e) {
      alert("Failed to submit. Please try again.");
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  /* ── Status badge ── */
  const StatusBadge = () => {
    if (isVerified) return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:100,
        background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)" }}>
        <Ico d={IC.shieldOk} size={16} color="#22C55E"/>
        <span style={{ fontSize:13, fontWeight:800, color:"#22C55E" }}>Verified Store</span>
      </div>
    );
    if (request?.status === "pending") return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:100,
        background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)" }}>
        <Ico d={IC.clock} size={16} color="#F59E0B"/>
        <span style={{ fontSize:13, fontWeight:800, color:"#F59E0B" }}>Under Review</span>
      </div>
    );
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:100,
        background:"rgba(0,0,0,0.05)", border:"1px solid rgba(0,0,0,0.1)" }}>
        <Ico d={IC.lock} size={16} color="#9CA3AF"/>
        <span style={{ fontSize:13, fontWeight:800, color:"var(--muted,#9CA3AF)" }}>Unverified</span>
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"var(--font-main,'Nunito',sans-serif)" }}>

      {/* Page header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"var(--text,#111)", letterSpacing:"-0.03em", lineHeight:1.1 }}>
            Store Verification
          </div>
          <div style={{ fontSize:13, color:"var(--muted,#9CA3AF)", fontWeight:500, marginTop:3 }}>
            Earn a verified badge and build customer trust
          </div>
        </div>
        {!loading && <StatusBadge/>}
      </div>

      {/* Verified hero */}
      {isVerified && (
        <div style={{ background:"linear-gradient(135deg,#046EF2,#22C55E)", borderRadius:18, padding:"28px 24px",
          marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Ico d={IC.shieldOk} size={28} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>
              {shop?.shopName || "Your store"} is Verified ✓
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", marginTop:3 }}>
              Your verified badge is visible on your store and all products.
            </div>
          </div>
        </div>
      )}

      {/* Current badge card */}
      {!isVerified && (
        <div style={{ background:"var(--card,#fff)", borderRadius:16,
          border:"1px solid rgba(0,0,0,0.07)", padding:"20px", marginBottom:16,
          display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"rgba(0,0,0,0.05)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Ico d={IC.lock} size={24} color="#9CA3AF"/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--muted,#9CA3AF)" }}>
              Current Status
            </div>
            <div style={{ fontSize:18, fontWeight:900, color:"var(--text,#111)", letterSpacing:"-0.02em", marginTop:3 }}>
              {request?.status === "pending" ? "Under Review" : "Unverified"}
            </div>
          </div>
          {request?.status === "pending" && (
            <div style={{ marginLeft:"auto", padding:"6px 12px", borderRadius:100, fontSize:12, fontWeight:700,
              background:"rgba(245,158,11,0.1)", color:"#F59E0B", border:"1px solid rgba(245,158,11,0.2)" }}>
              Pending
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      <div style={{ background:"var(--card,#fff)", borderRadius:16,
        border:"1px solid rgba(0,0,0,0.07)", padding:"20px", marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:"var(--text,#111)", marginBottom:16 }}>
          Why Get Verified?
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ display:"flex", alignItems:"flex-start", gap:12,
              padding:"12px 14px", borderRadius:12, background:"var(--bg,#F7F8FA)",
              border:"1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                background:`${b.color}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ico d={b.icon} size={18} color={b.color}/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"var(--text,#111)", marginBottom:3 }}>{b.title}</div>
                <div style={{ fontSize:12, color:"var(--muted,#6B7280)", lineHeight:1.5 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What you need */}
      {!isVerified && (
        <div style={{ background:"var(--card,#fff)", borderRadius:16,
          border:"1px solid rgba(0,0,0,0.07)", padding:"20px", marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--text,#111)", marginBottom:16 }}>
            What You'll Need
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {DOCS_NEEDED.map(doc => (
              <div key={doc.label} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:"rgba(4,110,242,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#046EF2" }}>
                  <Ico d={doc.icon} size={16} color="#046EF2"/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--text,#111)" }}>{doc.label}</div>
                  <div style={{ fontSize:11, color:"var(--muted,#9CA3AF)" }}>{doc.desc}</div>
                </div>
                <div style={{ marginLeft:"auto" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:"1.5px solid rgba(0,0,0,0.12)",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(0,0,0,0.12)" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request form */}
      {!isVerified && !request && (
        <div style={{ background:"var(--card,#fff)", borderRadius:16,
          border:"1px solid rgba(0,0,0,0.07)", padding:"20px", marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--text,#111)", marginBottom:4 }}>
            Request Verification
          </div>
          <div style={{ fontSize:13, color:"var(--muted,#9CA3AF)", marginBottom:16 }}>
            Our team will review your store and documents within 2–3 business days.
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, fontWeight:700, color:"var(--text,#111)", display:"block", marginBottom:8 }}>
              Note for our team (optional)
            </label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)}
              placeholder="Tell us about your store, experience, or anything that helps verify you…"
              rows={3} maxLength={500}
              style={{ width:"100%", padding:"12px 14px", border:"1.5px solid rgba(0,0,0,0.1)",
                borderRadius:10, background:"var(--bg,#F7F8FA)", color:"var(--text,#111)",
                fontSize:14, fontWeight:500, outline:"none", resize:"vertical",
                fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor="#046EF2"}
              onBlur={e=>e.target.style.borderColor="rgba(0,0,0,0.1)"}/>
          </div>
          <button type="button" onClick={handleSubmit} disabled={sending}
            style={{ width:"100%", height:50, borderRadius:12, border:"none",
              background:"#046EF2", color:"#fff", fontSize:14, fontWeight:800,
              cursor:sending?"wait":"pointer", opacity:sending?0.7:1,
              fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow:"0 4px 14px rgba(4,110,242,0.3)", transition:"opacity 0.15s" }}>
            <Ico d={IC.send} size={16} color="#fff"/>
            {sending ? "Submitting…" : "Submit Verification Request"}
          </button>
        </div>
      )}

      {/* Pending state */}
      {!isVerified && request?.status === "pending" && (
        <div style={{ background:"rgba(245,158,11,0.05)", borderRadius:16,
          border:"1px solid rgba(245,158,11,0.2)", padding:"20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"rgba(245,158,11,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Ico d={IC.clock} size={20} color="#F59E0B"/>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#F59E0B" }}>Review in Progress</div>
              <div style={{ fontSize:12, color:"var(--muted,#6B7280)" }}>2–3 business days</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:"var(--muted,#6B7280)", lineHeight:1.6 }}>
            Your verification request has been submitted. Our team is reviewing your store.
            We'll notify you once it's complete. If you have questions, contact{" "}
            <a href="/support" style={{ color:"#046EF2", fontWeight:700 }}>support</a>.
          </div>
        </div>
      )}

      {sent && (
        <div style={{ marginTop:12, padding:"12px 16px", borderRadius:10,
          background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)",
          fontSize:13, fontWeight:700, color:"#22C55E", display:"flex", alignItems:"center", gap:8 }}>
          <Ico d={IC.check} size={16} color="#22C55E"/>
          Request submitted successfully! We'll be in touch soon.
        </div>
      )}
    </div>
  );
}