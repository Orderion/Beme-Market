// src/pages/admin/sections/Support.jsx
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";

const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  send:  "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  check: "M20 6L9 17l-5-5",
  user:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  bot:   "M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M6 14a6 6 0 0 1 12 0v2H6v-2z|M12 22v-6",
};

function fmtDate(ts) {
  if (!ts) return "—";
  let d;
  if (ts?.toDate)         d = ts.toDate();
  else if (ts?.seconds)   d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  else d = new Date(ts);
  return d.toLocaleString("en-GH", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
}

function formatMsg(text) {
  if (!text) return "";
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/\n/g,"<br/>");
}

const STATUS = {
  open:        { label:"Open",        color:"#F59E0B", bg:"rgba(245,158,11,0.12)"  },
  in_progress: { label:"In Progress", color:"#046EF2", bg:"rgba(4,110,242,0.12)"  },
  resolved:    { label:"Resolved",    color:"#22C55E", bg:"rgba(34,197,94,0.12)"  },
};

export default function SupportSection() {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]); // seller's helpChats messages
  const [reply,    setReply]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [filter,   setFilter]   = useState("open");
  const bottomRef  = useRef(null);

  // Real-time tickets
  useEffect(() => {
    const q = query(collection(db, "helpTickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Real-time helpChats messages for selected seller
  useEffect(() => {
    if (!selected?.sellerId) { setChatMsgs([]); return; }
    const q = query(
      collection(db, "helpChats", selected.sellerId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, snap => {
      setChatMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [selected?.sellerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

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
      const token = await getAuth().currentUser.getIdToken(true);
      await fetch(`${API}/api/help/tickets/${selected.id}/reply`, {
        method:  "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:    JSON.stringify({ message: reply.trim(), resolve }),
      });
      setReply("");
      if (resolve) setSelected(prev => prev ? { ...prev, status:"resolved" } : null);
    } catch {
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const bk = { background:"#1a1d23", color:"#e5e7eb" }; // admin dark theme base

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)",
      fontFamily:"var(--font-main,'DM Sans',sans-serif)" }}>

      <div className="ap-page-header" style={{ flexShrink:0 }}>
        <div className="ap-page-title">Support Agent Inbox</div>
        <div className="ap-page-sub">Escalated seller help tickets — AI couldn't resolve these</div>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden", borderRadius:14,
        border:"1px solid rgba(255,255,255,0.07)", background:"#1e2128" }}>

        {/* ── Ticket list ── */}
        <div style={{ width:260, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.07)",
          display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Filter tabs */}
          <div style={{ display:"flex", gap:3, padding:"10px 10px 0", flexShrink:0 }}>
            {[["open","Open"],["active","Active"],["resolved","Done"],["all","All"]].map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ flex:1, padding:"5px 4px", borderRadius:7, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:700, fontFamily:"inherit",
                  background: filter === val ? "#7c3aed" : "rgba(255,255,255,0.06)",
                  color:      filter === val ? "#fff"    : "#9CA3AF",
                  transition:"background 0.12s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ height:68, margin:"6px 10px", borderRadius:10,
                  background:"rgba(255,255,255,0.06)" }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding:"40px 16px", textAlign:"center", color:"#6B7280", fontSize:13 }}>
                No {filter} tickets
              </div>
            ) : filtered.map(t => {
              const badge    = STATUS[t.status] || STATUS.open;
              const isActive = selected?.id === t.id;
              return (
                <div key={t.id} onClick={() => setSelected(t)}
                  style={{ padding:"10px 12px", cursor:"pointer",
                    borderLeft:`3px solid ${isActive ? "#7c3aed" : "transparent"}`,
                    borderBottom:"1px solid rgba(255,255,255,0.05)",
                    background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
                    transition:"background 0.12s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e5e7eb", flex:1, minWidth:0,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {t.shopName || t.sellerEmail?.split("@")[0] || "Unknown"}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:100,
                      background:badge.bg, color:badge.color, flexShrink:0, marginLeft:5 }}>
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"#6B7280", whiteSpace:"nowrap",
                    overflow:"hidden", textOverflow:"ellipsis", marginBottom:2 }}>
                    {t.summary?.slice(0,50) || "No summary"}
                  </div>
                  <div style={{ fontSize:10, color:"#4B5563" }}>{fmtDate(t.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {!selected ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              flexDirection:"column", gap:10, color:"#4B5563" }}>
              <Ico d={IC.user} size={40} color="rgba(255,255,255,0.08)" sw={1.2} />
              <div style={{ fontSize:13, fontWeight:700, color:"#6B7280" }}>Select a ticket</div>
            </div>
          ) : (
            <>
              {/* Ticket info bar */}
              <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#f3f4f6", marginBottom:2 }}>
                      {selected.shopName || selected.sellerEmail}
                    </div>
                    <div style={{ fontSize:11, color:"#6B7280" }}>
                      {selected.sellerEmail} · {fmtDate(selected.createdAt)}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:100,
                    background:(STATUS[selected.status]||STATUS.open).bg,
                    color:(STATUS[selected.status]||STATUS.open).color }}>
                    {(STATUS[selected.status]||STATUS.open).label}
                  </span>
                </div>
                {selected.summary && (
                  <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8,
                    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
                    fontSize:12, color:"#9CA3AF", lineHeight:1.6 }}>
                    {selected.summary}
                  </div>
                )}
              </div>

              {/* Chat messages — full conversation from helpChats */}
              <div style={{ flex:1, overflowY:"auto", padding:"14px 16px",
                display:"flex", flexDirection:"column", gap:10 }}>

                {chatMsgs.length === 0 && (
                  <div style={{ fontSize:12, color:"#4B5563", textAlign:"center", padding:"20px 0" }}>
                    Loading conversation…
                  </div>
                )}

                {chatMsgs.map((m, i) => {
                  const isUser  = m.role === "user";
                  const isAgent = m.source === "agent";
                  const isSystem = m.source === "system";
                  return (
                    <div key={m.id||i} style={{ display:"flex", flexDirection:"column",
                      alignItems: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{ fontSize:10, color:"#4B5563", marginBottom:3, fontWeight:600,
                        textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        {isUser ? "Seller" : isAgent ? "You (Agent)" : isSystem ? "System" : "AI"}
                      </div>
                      <div style={{
                        maxWidth:"80%", padding:"9px 13px", borderRadius:12,
                        fontSize:13, lineHeight:1.6,
                        background: isUser
                          ? "rgba(124,58,237,0.15)"
                          : isAgent
                          ? "rgba(4,110,242,0.15)"
                          : isSystem
                          ? "rgba(245,158,11,0.1)"
                          : "rgba(255,255,255,0.07)",
                        border: isUser
                          ? "1px solid rgba(124,58,237,0.25)"
                          : isAgent
                          ? "1px solid rgba(4,110,242,0.25)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color: isUser ? "#c4b5fd" : isAgent ? "#93c5fd" : "#d1d5db",
                        borderBottomRightRadius: isUser ? 4 : 12,
                        borderBottomLeftRadius:  isUser ? 12 : 4,
                      }}
                        dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }}
                      />
                      <div style={{ fontSize:10, color:"#374151", marginTop:2 }}>
                        {fmtDate(m.createdAt)}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "resolved" && (
                <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply to the seller…"
                    rows={3}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                      border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)",
                      color:"#f3f4f6", fontSize:13, fontFamily:"inherit", resize:"vertical",
                      outline:"none", marginBottom:8, boxSizing:"border-box", lineHeight:1.6 }} />
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => sendReply(false)} disabled={sending || !reply.trim()}
                      style={{ flex:1, padding:"8px 14px", borderRadius:9, border:"none",
                        background:"#7c3aed", color:"#fff", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit",
                        opacity: sending || !reply.trim() ? 0.5 : 1, transition:"opacity 0.15s" }}>
                      {sending ? "Sending…" : "Send Reply"}
                    </button>
                    <button onClick={() => sendReply(true)} disabled={sending || !reply.trim()}
                      style={{ padding:"8px 14px", borderRadius:9,
                        border:"1px solid rgba(34,197,94,0.4)", background:"rgba(34,197,94,0.1)",
                        color:"#4ade80", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                        opacity: sending || !reply.trim() ? 0.5 : 1 }}>
                      <Ico d={IC.check} size={13} color="#4ade80" /> Reply & Resolve
                    </button>
                  </div>
                </div>
              )}
              {selected.status === "resolved" && (
                <div style={{ padding:"14px 16px", borderTop:"1px solid rgba(255,255,255,0.07)",
                  textAlign:"center", fontSize:12, color:"#4ade80", fontWeight:700 }}>
                  Ticket resolved
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}