// src/pages/admin/sections/Support.jsx
// Agent inbox — escalated seller help tickets only
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  send:   "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  check:  "M20 6L9 17l-5-5",
  user:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  clock:  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2",
  close:  "M18 6L6 18|M6 6l12 12",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts.seconds * 1000);
  return d.toLocaleString("en-GH", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
}

const STATUS_BADGE = {
  open:        { label:"Open",        color:"#F59E0B", bg:"rgba(245,158,11,0.1)"  },
  in_progress: { label:"In Progress", color:"#046EF2", bg:"rgba(4,110,242,0.1)"  },
  resolved:    { label:"Resolved",    color:"#22C55E", bg:"rgba(34,197,94,0.1)"  },
};

export default function SupportSection() {
  const { user }     = useAuth();
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [replies,    setReplies]    = useState([]);
  const [reply,      setReply]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [filter,     setFilter]     = useState("open");
  const bottomRef    = useRef(null);

  // Real-time tickets
  useEffect(() => {
    const q = query(collection(db, "helpTickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Load replies when ticket selected
  useEffect(() => {
    if (!selected) { setReplies([]); return; }
    const q = query(
      collection(db, "helpTickets", selected.id, "replies"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, snap => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const filtered = tickets.filter(t => {
    if (filter === "open")     return t.status === "open";
    if (filter === "active")   return t.status === "in_progress";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  const sendReply = async (resolve = false) => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    try {
      const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";
      const { getAuth } = await import("firebase/auth");
      const token = await getAuth().currentUser.getIdToken(true);

      await fetch(`${API}/api/help/tickets/${selected.id}/reply`, {
        method:  "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:    JSON.stringify({ message: reply.trim(), resolve }),
      });

      setReply("");
      if (resolve) {
        setSelected(prev => prev ? { ...prev, status:"resolved" } : null);
      }
    } catch (e) {
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)", fontFamily:"var(--font-main,'DM Sans',sans-serif)" }}>
      <div className="ap-page-header" style={{ flexShrink:0 }}>
        <div className="ap-page-title">Support Agent Inbox</div>
        <div className="ap-page-sub">Escalated seller help tickets — AI couldn't resolve these</div>
      </div>

      <div style={{ display:"flex", flex:1, gap:0, overflow:"hidden", border:"1px solid rgba(0,0,0,0.07)", borderRadius:14, background:"#fff" }}>

        {/* ── Ticket list ── */}
        <div style={{ width:280, flexShrink:0, borderRight:"1px solid rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Filter tabs */}
          <div style={{ display:"flex", gap:4, padding:"10px 12px", borderBottom:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
            {[["open","Open"],["active","Active"],["resolved","Done"],["all","All"]].map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ flex:1, padding:"4px 6px", borderRadius:7, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:700, fontFamily:"inherit",
                  background: filter === val ? "#111" : "transparent",
                  color:      filter === val ? "#fff" : "#9CA3AF" }}>
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ height:72, margin:"8px 12px", borderRadius:10,
                  background:"rgba(0,0,0,0.06)", animation:"pulse 1.4s ease infinite" }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding:"40px 16px", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
                No {filter} tickets
              </div>
            ) : (
              filtered.map(t => {
                const badge = STATUS_BADGE[t.status] || STATUS_BADGE.open;
                const isActive = selected?.id === t.id;
                return (
                  <div key={t.id} onClick={() => setSelected(t)}
                    style={{ padding:"12px 14px", cursor:"pointer", borderLeft:`3px solid ${isActive?"#111":"transparent"}`,
                      borderBottom:"1px solid rgba(0,0,0,0.05)",
                      background: isActive ? "#f9fafb" : "transparent",
                      transition:"background 0.12s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#111", flex:1, minWidth:0,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {t.shopName || t.sellerEmail || "Unknown seller"}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:100,
                        background:badge.bg, color:badge.color, flexShrink:0, marginLeft:6 }}>
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:"#6B7280", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>
                      {t.summary || "No summary"}
                    </div>
                    <div style={{ fontSize:10, color:"#9CA3AF" }}>{fmtDate(t.createdAt)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Ticket detail ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {!selected ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              flexDirection:"column", gap:10, color:"#9CA3AF" }}>
              <Ico d={IC.user} size={40} color="rgba(0,0,0,0.1)" sw={1.2} />
              <div style={{ fontSize:14, fontWeight:700 }}>Select a ticket</div>
            </div>
          ) : (
            <>
              {/* Ticket header */}
              <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#111", marginBottom:3 }}>
                      {selected.shopName || selected.sellerEmail}
                    </div>
                    <div style={{ fontSize:12, color:"#6B7280" }}>
                      {selected.sellerEmail} · {fmtDate(selected.createdAt)}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:100,
                    background:(STATUS_BADGE[selected.status]||STATUS_BADGE.open).bg,
                    color:(STATUS_BADGE[selected.status]||STATUS_BADGE.open).color }}>
                    {(STATUS_BADGE[selected.status]||STATUS_BADGE.open).label}
                  </span>
                </div>
                {selected.summary && (
                  <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10,
                    background:"#f8f9fb", border:"1px solid rgba(0,0,0,0.06)",
                    fontSize:13, color:"#374151", lineHeight:1.6 }}>
                    {selected.summary}
                  </div>
                )}
              </div>

              {/* AI history */}
              {selected.aiHistory?.length > 0 && (
                <div style={{ padding:"10px 18px", borderBottom:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase",
                    letterSpacing:"0.07em", marginBottom:8 }}>AI Conversation History</div>
                  <div style={{ maxHeight:120, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
                    {selected.aiHistory.map((h, i) => (
                      <div key={i} style={{ fontSize:12, padding:"6px 10px", borderRadius:8,
                        background: h.role === "user" ? "#f0f0f0" : "rgba(124,58,237,0.06)",
                        color: "#374151", lineHeight:1.5 }}>
                        <strong style={{ color: h.role === "user" ? "#111" : "#7c3aed" }}>
                          {h.role === "user" ? "Seller" : "AI"}:
                        </strong>{" "}{h.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent replies */}
              <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                {replies.length === 0 && (
                  <div style={{ fontSize:13, color:"#9CA3AF", textAlign:"center", padding:"20px 0" }}>
                    No replies yet — be the first to respond
                  </div>
                )}
                {replies.map(r => (
                  <div key={r.id} style={{ padding:"10px 14px", borderRadius:12,
                    background:"rgba(4,110,242,0.06)", border:"1px solid rgba(4,110,242,0.12)",
                    fontSize:13, color:"#111", lineHeight:1.6 }}>
                    <div style={{ fontSize:11, color:"#046EF2", fontWeight:700, marginBottom:5 }}>
                      Admin · {fmtDate(r.createdAt)}
                    </div>
                    {r.message}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "resolved" && (
                <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
                  <textarea
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply to the seller…"
                    rows={3}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid rgba(0,0,0,0.1)",
                      fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none",
                      marginBottom:10, boxSizing:"border-box", lineHeight:1.6 }}
                  />
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => sendReply(false)} disabled={sending || !reply.trim()}
                      style={{ flex:1, padding:"9px 16px", borderRadius:10, border:"none",
                        background:"#046EF2", color:"#fff", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit", opacity: sending || !reply.trim() ? 0.5 : 1 }}>
                      {sending ? "Sending…" : "Send Reply"}
                    </button>
                    <button onClick={() => sendReply(true)} disabled={sending || !reply.trim()}
                      style={{ padding:"9px 16px", borderRadius:10, border:"1.5px solid #22C55E",
                        background:"transparent", color:"#22C55E", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit", opacity: sending || !reply.trim() ? 0.5 : 1,
                        whiteSpace:"nowrap" }}>
                      <Ico d={IC.check} size={13} color="#22C55E" /> Reply & Resolve
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}