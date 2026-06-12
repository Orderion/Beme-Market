// Beme-Frontend/src/pages/dashboard/DashboardSettings.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc, getDoc, addDoc, getDocs, collection,
  serverTimestamp, query, where, orderBy, limit,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useTheme } from "../../context/ThemeContext";

let setupTOTP   = async () => ({ otpauth: "", secret: "" });
let enableTOTP  = async () => {};
let disableTOTP = async () => {};
let useAISettings = () => ({ settings: {}, loading: false, saving: false, updateSetting: () => {} });

try { const m = await import("../../services/twoFactorService"); setupTOTP = m.setupTOTP; enableTOTP = m.enableTOTP; disableTOTP = m.disableTOTP; } catch {}
try { const m = await import("../../hooks/useAISettings"); useAISettings = m.useAISettings; } catch {}

function Ico({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  shieldOk: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
  verify:   "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3",
  truck:    "M1 3h15v13H1z|M16 8h4l3 3v5h-7V8z|M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z|M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  sparkle:  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  sun:      "M12 1v2|M12 21v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M1 12h2|M21 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42|M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  moon:     "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  monitor:  "M2 3h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M8 21h8|M12 17v4",
  trash:    "M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  check:    "M20 6L9 17l-5-5",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
  info:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 16v-4|M12 8h.01",
  clock:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2",
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  map:      "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z|M8 2v16|M16 6v16",
  package:  "M16.5 9.4l-9-5.19|M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  chevR:    "M9 18l6-6-6-6",
  chevL:    "M15 18l-6-6 6-6",
};

function Toggle({ on, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      style={{ width:44,height:26,borderRadius:13,flexShrink:0,background:on?"var(--sd-accent)":"var(--sd-border)",border:"none",cursor:disabled?"not-allowed":"pointer",position:"relative",transition:"background 0.2s" }}>
      <span style={{ position:"absolute",top:3,left:on?20:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.15)" }}/>
    </button>
  );
}

function QRCode({ value, size = 180 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    import("qrcode").then(mod => {
      const QR = mod.default || mod;
      QR.toCanvas(canvasRef.current, value, { width:size,margin:2,color:{dark:"#111",light:"#fff"} }).catch(console.error);
    }).catch(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) { ctx.fillStyle="#f0f4ff"; ctx.fillRect(0,0,size,size); }
    });
  }, [value, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius:12,display:"block" }}/>;
}

function OtpInput({ onComplete, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const refs = useRef([]);
  useEffect(() => { if (!disabled) setDigits(Array(6).fill("")); }, [disabled]);
  const handleDigit = (i, val) => {
    const c = val.replace(/\D/g,"").slice(-1);
    const next = [...digits]; next[i]=c; setDigits(next);
    if (c && i<5) refs.current[i+1]?.focus();
    if (next.every(d=>d!=="")) onComplete(next.join(""));
  };
  const handleKey = (i,e) => { if (e.key==="Backspace"&&!digits[i]&&i>0) refs.current[i-1]?.focus(); };
  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    const next=Array(6).fill(""); p.split("").forEach((ch,i)=>{next[i]=ch;});
    setDigits(next); refs.current[Math.min(p.length,5)]?.focus();
    if (p.length===6) onComplete(p);
  };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center",margin:"8px 0" }} onPaste={handlePaste}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el}
          style={{ width:46,height:56,borderRadius:10,border:`2px solid ${d?"var(--sd-accent)":"var(--sd-border)"}`,fontSize:22,fontWeight:800,textAlign:"center",fontFamily:"var(--sd-font)",background:d?"var(--sd-accent-dim)":"var(--sd-white)",color:"var(--sd-text)",outline:"none",transition:"border-color 0.15s" }}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKey(i,e)}
          autoFocus={i===0} disabled={disabled}/>
      ))}
    </div>
  );
}

// ── SECURITY TAB ──
function SecurityTab() {
  const [mfaEnabled,setMfaEnabled]=useState(false);
  const [statusLoading,setStatusLoading]=useState(true);
  const [setupStep,setSetupStep]=useState("idle");
  const [otpauth,setOtpauth]=useState("");
  const [secret,setSecret]=useState("");
  const [setupLoading,setSetupLoading]=useState(false);
  const [setupError,setSetupError]=useState("");
  const [disableStep,setDisableStep]=useState("idle");
  const [disableLoading,setDisableLoading]=useState(false);
  const [disableError,setDisableError]=useState("");
  const [successMsg,setSuccessMsg]=useState("");
  useEffect(()=>{ const u=auth.currentUser; if(!u){setStatusLoading(false);return;} getDoc(doc(db,"users",u.uid)).then(snap=>setMfaEnabled(snap.data()?.mfa?.enabled===true)).catch(()=>{}).finally(()=>setStatusLoading(false)); },[]);
  const handleStartSetup=async()=>{ setSetupLoading(true);setSetupError("");setSuccessMsg(""); try{const d=await setupTOTP();setOtpauth(d.otpauth);setSecret(d.secret);setSetupStep("qr");}catch(e){setSetupError(e?.message||"Could not start setup.");}finally{setSetupLoading(false);} };
  const handleEnable=async(code)=>{ if(setupLoading)return;setSetupLoading(true);setSetupError(""); try{await enableTOTP(code);setMfaEnabled(true);setSetupStep("done");setSuccessMsg("Two-step verification is now active.");}catch(e){setSetupError(e?.message||"Incorrect code.");setSetupLoading(false);} };
  const handleDisable=async(code)=>{ if(disableLoading)return;setDisableLoading(true);setDisableError(""); try{await disableTOTP(code);setMfaEnabled(false);setDisableStep("idle");setSetupStep("idle");setSuccessMsg("Two-step verification has been turned off.");}catch(e){setDisableError(e?.message||"Incorrect code.");setDisableLoading(false);} };
  if(statusLoading) return <div style={{ padding:"40px 0",color:"var(--sd-muted)",fontSize:14 }}>Loading…</div>;
  return (
    <div style={{ maxWidth:560 }}>
      <h2 className="ds-content-title">Security</h2>
      <p className="ds-content-sub">Protect your account with two-step verification.</p>
      {successMsg&&(<div style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 16px",borderRadius:10,background:"rgba(21,128,61,0.08)",border:"1px solid rgba(21,128,61,0.2)",color:"#15803d",fontSize:13,fontWeight:600,marginBottom:20 }}><Ico d={IC.check} size={16} color="#15803d" sw={2.5}/>{successMsg}</div>)}
      <div style={{ background:"var(--sd-white)",border:"1px solid var(--sd-border)",borderRadius:16,overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:14,padding:"20px 22px",borderBottom:"1px solid var(--sd-border-light)" }}>
          <div style={{ width:42,height:42,borderRadius:12,background:"var(--sd-accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ico d={IC.shield} size={20} color="var(--sd-accent)"/></div>
          <div style={{ flex:1 }}><div style={{ fontSize:15,fontWeight:800,color:"var(--sd-text)",marginBottom:3 }}>Two-step verification</div><div style={{ fontSize:13,color:"var(--sd-muted)",lineHeight:1.6 }}>Require a 6-digit code from your authenticator app every time you sign in.</div></div>
          <span style={{ padding:"4px 12px",borderRadius:100,fontSize:12,fontWeight:700,background:mfaEnabled?"rgba(21,128,61,0.1)":"var(--sd-bg)",color:mfaEnabled?"#15803d":"var(--sd-muted)",border:`1px solid ${mfaEnabled?"rgba(21,128,61,0.2)":"var(--sd-border)"}`,whiteSpace:"nowrap",alignSelf:"center" }}>{mfaEnabled?"Active":"Off"}</span>
        </div>
        <div style={{ padding:"20px 22px" }}>
          {!mfaEnabled&&setupStep==="idle"&&(<><div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:20 }}>{["Install Google Authenticator or Authy","Scan the QR code shown","Enter your first 6-digit code"].map((s,i)=>(<div key={i} style={{ display:"flex",alignItems:"center",gap:12 }}><div style={{ width:26,height:26,borderRadius:"50%",background:"var(--sd-accent-dim)",color:"var(--sd-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0 }}>{i+1}</div><span style={{ fontSize:13,fontWeight:600,color:"var(--sd-text)" }}>{s}</span></div>))}</div><button className="sd-btn sd-btn-primary" onClick={handleStartSetup} disabled={setupLoading}>{setupLoading?"Setting up…":"Set up authenticator"}</button>{setupError&&<p style={{ fontSize:13,color:"var(--sd-danger)",marginTop:10 }}>{setupError}</p>}</>)}
          {!mfaEnabled&&setupStep==="qr"&&(<><p style={{ fontSize:14,color:"var(--sd-text)",marginBottom:16 }}><strong>Step 1:</strong> Scan this QR code with your authenticator app.</p><div style={{ display:"flex",justifyContent:"center",padding:16,background:"var(--sd-bg)",borderRadius:12,marginBottom:16 }}><QRCode value={otpauth} size={180}/></div><details style={{ border:"1px solid var(--sd-border)",borderRadius:10,padding:"10px 14px",marginBottom:16 }}><summary style={{ fontSize:13,fontWeight:600,color:"var(--sd-muted)",cursor:"pointer" }}>Can't scan? Enter code manually</summary><div style={{ display:"flex",alignItems:"center",gap:10,marginTop:10,background:"var(--sd-bg)",borderRadius:8,padding:"10px 12px" }}><code style={{ flex:1,fontSize:12,fontFamily:"monospace",color:"var(--sd-text)",wordBreak:"break-all",letterSpacing:"0.06em" }}>{secret}</code><button onClick={()=>navigator.clipboard?.writeText(secret)} style={{ padding:"4px 12px",borderRadius:6,border:"1px solid var(--sd-border)",background:"var(--sd-white)",fontSize:12,fontWeight:700,cursor:"pointer",color:"var(--sd-text)" }}>Copy</button></div></details><p style={{ fontSize:14,color:"var(--sd-text)",marginBottom:12 }}><strong>Step 2:</strong> Enter the 6-digit code from your app.</p><OtpInput onComplete={handleEnable} disabled={setupLoading}/>{setupError&&<p style={{ fontSize:13,color:"var(--sd-danger)",marginTop:10,textAlign:"center" }}>{setupError}</p>}{setupLoading&&<p style={{ fontSize:13,color:"var(--sd-muted)",textAlign:"center",marginTop:8 }}>Verifying…</p>}<button className="sd-btn sd-btn-ghost" style={{ width:"100%",justifyContent:"center",marginTop:12 }} onClick={()=>{setSetupStep("idle");setSetupError("");}} disabled={setupLoading}>Cancel</button></>)}
          {!mfaEnabled&&setupStep==="done"&&(<div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"12px 0" }}><div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(21,128,61,0.1)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}><Ico d={IC.check} size={26} color="#15803d" sw={2.5}/></div><p style={{ fontSize:14,color:"var(--sd-text)",fontWeight:500,lineHeight:1.6 }}>Two-step verification is active. You'll need your app every time you sign in.</p></div>)}
          {mfaEnabled&&(<><div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,background:"rgba(21,128,61,0.06)",border:"1px solid rgba(21,128,61,0.15)",marginBottom:16 }}><Ico d={IC.shieldOk} size={18} color="#15803d"/><span style={{ fontSize:13,fontWeight:600,color:"#15803d" }}>Your account is protected with two-step verification.</span></div>{disableStep==="idle"&&(<button className="sd-btn sd-btn-danger" onClick={()=>{setDisableStep("confirm");setDisableError("");}}>Turn off two-step verification</button>)}{disableStep==="confirm"&&(<div style={{ padding:16,background:"var(--sd-danger-bg)",borderRadius:10,border:"1px solid rgba(185,28,28,0.15)" }}><p style={{ fontSize:13,color:"var(--sd-danger)",marginBottom:14,fontWeight:600 }}>Enter your current 6-digit code to confirm turning this off.</p><OtpInput onComplete={handleDisable} disabled={disableLoading}/>{disableError&&<p style={{ fontSize:13,color:"var(--sd-danger)",marginTop:8,textAlign:"center" }}>{disableError}</p>}<button className="sd-btn sd-btn-ghost" style={{ width:"100%",justifyContent:"center",marginTop:12 }} onClick={()=>{setDisableStep("idle");setDisableError("");}} disabled={disableLoading}>Cancel</button></div>)}</>)}
        </div>
      </div>
      <div style={{ marginTop:16,padding:"16px 18px",background:"var(--sd-bg)",borderRadius:14,border:"1px solid var(--sd-border)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}><Ico d={IC.info} size={15} color="var(--sd-muted)"/><span style={{ fontSize:12,fontWeight:700,color:"var(--sd-muted)" }}>Recommended apps</span></div>
        <ul style={{ margin:0,paddingLeft:20,fontSize:12,color:"var(--sd-muted)",lineHeight:1.8 }}>
          <li><strong style={{ color:"var(--sd-text)" }}>Google Authenticator</strong> — iOS &amp; Android, simple and free</li>
          <li><strong style={{ color:"var(--sd-text)" }}>Authy</strong> — Supports cloud backup across devices</li>
          <li><strong style={{ color:"var(--sd-text)" }}>Microsoft Authenticator</strong> — iOS &amp; Android</li>
        </ul>
      </div>
    </div>
  );
}

// ── VERIFICATION TAB ──
const BENEFITS=[{icon:IC.shieldOk,color:"#7c3aed",title:"Build Trust",desc:"Verified badge on your store and all product listings."},{icon:IC.star,color:"#22C55E",title:"Higher Ranking",desc:"Verified sellers rank higher in search results."},{icon:IC.user,color:"#F59E0B",title:"Higher Limits",desc:"Access higher weekly withdrawal limits and priority payouts."}];
function VerificationTab(){const{user}=useAuth();const{shop}=useSellerAuth();const[request,setRequest]=useState(null);const[loading,setLoading]=useState(true);const[sending,setSending]=useState(false);const[message,setMessage]=useState("");const[sent,setSent]=useState(false);const isVerified=!!(shop?.verified||shop?.verifiedBadge);useEffect(()=>{if(!user?.uid){setLoading(false);return;}getDocs(query(collection(db,"verificationRequests"),where("sellerId","==",user.uid),orderBy("createdAt","desc"),limit(1))).then(snap=>{if(!snap.empty)setRequest({id:snap.docs[0].id,...snap.docs[0].data()});}).catch(()=>{}).finally(()=>setLoading(false));},[user?.uid]);const handleSubmit=async()=>{if(!user?.uid)return;setSending(true);try{await addDoc(collection(db,"verificationRequests"),{sellerId:user.uid,shopId:shop?.id||null,shopName:shop?.shopName||"",message:message.trim(),status:"pending",createdAt:serverTimestamp()});setSent(true);setMessage("");setRequest({status:"pending"});}catch{alert("Failed to submit.");}finally{setSending(false);}};const StatusBadge=()=>{if(isVerified)return(<span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:100,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",fontSize:12,fontWeight:800,color:"#22C55E" }}><Ico d={IC.shieldOk} size={13} color="#22C55E"/>Verified</span>);if(request?.status==="pending")return(<span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:100,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",fontSize:12,fontWeight:800,color:"#F59E0B" }}><Ico d={IC.clock} size={13} color="#F59E0B"/>Under Review</span>);return(<span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:100,background:"var(--sd-bg)",border:"1px solid var(--sd-border)",fontSize:12,fontWeight:800,color:"var(--sd-muted)" }}><Ico d={IC.lock} size={13} color="var(--sd-muted)"/>Unverified</span>);};
  return(<div style={{ maxWidth:560 }}><div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24 }}><div><h2 className="ds-content-title">Store Verification</h2><p style={{ fontSize:13,color:"var(--sd-muted)",margin:0 }}>Earn a verified badge and unlock higher limits.</p></div>{!loading&&<StatusBadge/>}</div>{isVerified&&(<div style={{ background:"linear-gradient(135deg,#7c3aed,#22C55E)",borderRadius:16,padding:"24px 22px",marginBottom:20,display:"flex",alignItems:"center",gap:14 }}><div style={{ width:48,height:48,borderRadius:14,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ico d={IC.shieldOk} size={24} color="#fff"/></div><div><div style={{ fontSize:16,fontWeight:900,color:"#fff" }}>{shop?.shopName||"Your store"} is Verified</div><div style={{ fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2 }}>Verified badge is visible on your store and all products.</div></div></div>)}<div className="sd-panel" style={{ marginBottom:16 }}><div style={{ fontSize:14,fontWeight:800,color:"var(--sd-text)",marginBottom:14 }}>Why Get Verified?</div><div style={{ display:"flex",flexDirection:"column",gap:10 }}>{BENEFITS.map(b=>(<div key={b.title} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px",borderRadius:10,background:"var(--sd-bg)",border:"1px solid var(--sd-border)" }}><div style={{ width:36,height:36,borderRadius:9,background:b.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ico d={b.icon} size={16} color={b.color}/></div><div><div style={{ fontSize:13,fontWeight:800,color:"var(--sd-text)",marginBottom:2 }}>{b.title}</div><div style={{ fontSize:12,color:"var(--sd-muted)",lineHeight:1.5 }}>{b.desc}</div></div></div>))}</div></div>{!isVerified&&(<div className="sd-panel" style={{ marginBottom:16 }}><div style={{ fontSize:14,fontWeight:800,color:"var(--sd-text)",marginBottom:14 }}>What You'll Need</div>{[{icon:IC.user,label:"Government-issued ID",desc:"Ghana Card, Passport, or Driver's Licence"},{icon:IC.file,label:"Business registration",desc:"Optional but speeds up verification"},{icon:IC.file,label:"Proof of address",desc:"Utility bill or bank statement (last 3 months)"}].map(d=>(<div key={d.label} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--sd-border-light)" }}><div style={{ width:34,height:34,borderRadius:9,background:"var(--sd-accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ico d={d.icon} size={15} color="var(--sd-accent)"/></div><div><div style={{ fontSize:13,fontWeight:700,color:"var(--sd-text)" }}>{d.label}</div><div style={{ fontSize:11,color:"var(--sd-muted)" }}>{d.desc}</div></div></div>))}</div>)}{!isVerified&&!request&&(<div className="sd-panel"><div style={{ fontSize:14,fontWeight:800,color:"var(--sd-text)",marginBottom:4 }}>Request Verification</div><div style={{ fontSize:13,color:"var(--sd-muted)",marginBottom:16 }}>Our team reviews requests within 2–3 business days.</div><div className="sd-form-group"><label className="sd-label">Note for our team (optional)</label><textarea className="sd-textarea" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us about your store…"/></div><button className="sd-btn sd-btn-primary" style={{ width:"100%",justifyContent:"center" }} onClick={handleSubmit} disabled={sending}>{sending?"Submitting…":<><Ico d={IC.send} size={14}/>Submit Request</>}</button></div>)}{!isVerified&&request?.status==="pending"&&(<div style={{ padding:20,background:"rgba(245,158,11,0.05)",borderRadius:14,border:"1px solid rgba(245,158,11,0.2)" }}><div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}><Ico d={IC.clock} size={20} color="#F59E0B"/><div style={{ fontSize:14,fontWeight:800,color:"#F59E0B" }}>Review in Progress · 2–3 business days</div></div><div style={{ fontSize:13,color:"var(--sd-muted)",lineHeight:1.6 }}>Your request has been submitted. We'll notify you once the review is complete.</div></div>)}{sent&&(<div style={{ marginTop:12,padding:"12px 16px",borderRadius:10,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",fontSize:13,fontWeight:700,color:"#22C55E",display:"flex",alignItems:"center",gap:8 }}><Ico d={IC.check} size={16} color="#22C55E"/>Request submitted successfully!</div>)}</div>);
}

// ── PAYMENT PREFERENCES TAB ──
function PaymentPreferencesTab() {
  const { user } = useAuth();
  const { storeId, shop } = useSellerAuth();
  const shopDocId = storeId || user?.uid;
  const [paymentTypes, setPaymentTypes] = useState(["paystack", "cod"]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!shopDocId) { setLoading(false); return; }
    getDoc(doc(db, "shops", shopDocId))
      .then(snap => {
        if (snap.exists()) {
          const pt = snap.data().paymentTypes;
          if (Array.isArray(pt) && pt.length > 0) setPaymentTypes(pt);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopDocId]);

  const OPTIONS = [
    { id:"both",     label:"Both — Paystack & Pay on Delivery", desc:"Buyers choose their preferred payment method at checkout.", icon:IC.verify, color:"#22C55E" },
    { id:"paystack", label:"Paystack Only",                     desc:"Card, bank transfer, and mobile money via Paystack. No cash on delivery.", icon:IC.lock, color:"#046EF2" },
    { id:"cod",      label:"Pay on Delivery Only",              desc:"Buyers pay cash or MoMo when the order arrives. No online payment.", icon:IC.truck, color:"#F59E0B" },
  ];

  const selected = paymentTypes.includes("paystack") && paymentTypes.includes("cod") ? "both"
    : paymentTypes.includes("paystack") ? "paystack"
    : paymentTypes.includes("cod") ? "cod"
    : "both";

  const handleSelect = (val) => {
    if (val === "both") setPaymentTypes(["paystack", "cod"]);
    else setPaymentTypes([val]);
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "shops", shopDocId), { paymentTypes, updatedAt: serverTimestamp() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding:"40px 0",color:"var(--sd-muted)",fontSize:14 }}>Loading…</div>;

  return (
    <div style={{ maxWidth:560 }}>
      <h2 className="ds-content-title">Payment Preferences</h2>
      <p className="ds-content-sub">Choose which payment methods buyers can use at checkout for your products.</p>
      <div className="sd-panel" style={{ marginBottom:16 }}>
        <div style={{ fontSize:12,fontWeight:700,color:"var(--sd-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14 }}>Accepted Payment Methods</div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {OPTIONS.map(opt => (
            <label key={opt.id} onClick={() => handleSelect(opt.id)}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:`1.5px solid ${selected===opt.id?"var(--sd-accent)":"var(--sd-border)"}`,background:selected===opt.id?"var(--sd-accent-dim)":"var(--sd-bg)",cursor:"pointer",transition:"all 0.12s",boxShadow:selected===opt.id?"0 0 0 3px rgba(124,58,237,0.08)":"none" }}>
              <div style={{ width:42,height:42,borderRadius:11,background:selected===opt.id?`${opt.color}18`:"var(--sd-white)",border:`1px solid ${selected===opt.id?opt.color:"var(--sd-border)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.12s" }}>
                <Ico d={opt.icon} size={18} color={selected===opt.id?opt.color:"var(--sd-muted)"}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--sd-text)",marginBottom:3 }}>{opt.label}</div>
                <div style={{ fontSize:12,color:"var(--sd-muted)",lineHeight:1.5 }}>{opt.desc}</div>
              </div>
              <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,border:`2px solid ${selected===opt.id?"var(--sd-accent)":"var(--sd-border)"}`,display:"flex",alignItems:"center",justifyContent:"center",background:selected===opt.id?"var(--sd-accent-dim)":"transparent",transition:"all 0.12s" }}>
                {selected===opt.id && <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--sd-accent)" }}/>}
              </div>
            </label>
          ))}
        </div>
      </div>
      <div style={{ padding:"14px 16px",borderRadius:12,background:"rgba(4,110,242,0.05)",border:"1px solid rgba(4,110,242,0.15)",display:"flex",alignItems:"flex-start",gap:10,marginBottom:20 }}>
        <Ico d={IC.info} size={16} color="#046EF2"/>
        <div style={{ fontSize:12,color:"var(--sd-text)",lineHeight:1.65 }}>
          {selected==="both"?"Buyers will see both Paystack and Pay on Delivery at checkout and can choose freely."
            :selected==="paystack"?"Only Paystack will appear at checkout. Pay on Delivery will be hidden for your products."
            :"Only Pay on Delivery will appear. Paystack will be hidden for your products."}
        </div>
      </div>
      {error&&<div style={{ padding:"10px 14px",borderRadius:8,background:"var(--sd-danger-bg)",color:"var(--sd-danger)",fontSize:13,fontWeight:600,marginBottom:14 }}>{error}</div>}
      {saved&&<div style={{ padding:"10px 14px",borderRadius:8,background:"rgba(21,128,61,0.08)",border:"1px solid rgba(21,128,61,0.2)",color:"#15803d",fontSize:13,fontWeight:600,marginBottom:14,display:"flex",alignItems:"center",gap:8 }}><Ico d={IC.check} size={15} color="#15803d" sw={2.5}/>Payment preferences saved.</div>}
      <button className="sd-btn sd-btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save Payment Preferences"}</button>
    </div>
  );
}

// ── AI CAPABILITIES TAB ──
const AUTOS=[{key:"aiCustomerReplies",label:"Customer Auto-Replies",desc:"AI handles common buyer questions automatically"},{key:"aiProductDescriptions",label:"Product Descriptions",desc:"Generate optimised product copy from a prompt"},{key:"aiSeoOptimization",label:"SEO Optimization",desc:"Improve product titles for search visibility"},{key:"aiSalesSuggestions",label:"Sales Suggestions",desc:"Personalised tips to boost your conversion rate"},{key:"aiMarketingAssistant",label:"Marketing Assistant",desc:"Instagram, TikTok and WhatsApp captions"},{key:"aiAnalyticsExplainer",label:"Analytics Explainer",desc:"Understand your metrics in plain English"},{key:"aiFollowUpSuggestions",label:"Follow-Up Suggestions",desc:"Re-engage past buyers with targeted prompts"},{key:"aiStoreHealthAnalysis",label:"Store Health Analysis",desc:"Weekly diagnosis of your store performance"}];
function AICapabilitiesTab(){const{settings,loading,saving,updateSetting}=useAISettings();return(<div style={{ maxWidth:560 }}><h2 className="ds-content-title">AI Capabilities</h2><p className="ds-content-sub">Control which AI features are active across your store.</p><div className="sd-panel" style={{ marginBottom:16 }}><div style={{ fontSize:12,fontWeight:700,color:"var(--sd-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4 }}>Automation Toggles</div><div style={{ fontSize:12,color:"var(--sd-muted)",marginBottom:16 }}>Changes take effect within a few minutes.</div>{loading?<div style={{ fontSize:13,color:"var(--sd-muted)",padding:"8px 0" }}>Loading settings…</div>:AUTOS.map((a,idx)=>(<div key={a.key} style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,padding:"13px 0",borderBottom:idx<AUTOS.length-1?"1px solid var(--sd-border-light)":"none" }}><div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:"var(--sd-text)",marginBottom:3 }}>{a.label}</div><div style={{ fontSize:12,color:"var(--sd-muted)",lineHeight:1.5 }}>{a.desc}</div></div><Toggle on={!!settings[a.key]} onChange={v=>updateSetting(a.key,v)} disabled={saving}/></div>))}</div><div style={{ padding:"14px 16px",borderRadius:12,background:"var(--sd-accent-dim)",border:"1px solid var(--sd-accent-border)",display:"flex",alignItems:"flex-start",gap:10 }}><Ico d={IC.sparkle} size={16} color="var(--sd-accent)"/><div style={{ fontSize:12,color:"var(--sd-text)",lineHeight:1.6 }}>To chat directly with Beme AI, visit the <strong>Beme AI</strong> tab in the sidebar. These toggles control background automations only.</div></div></div>);}

// ── PREFERENCES TAB ──
function PreferencesTab(){const{theme,toggleTheme}=useTheme();const[selected,setSelected]=useState(()=>{if(typeof window!=="undefined"&&document.body.classList.contains("dark"))return"dark";return"light";});const applyTheme=(t)=>{setSelected(t);if(t==="system"){const prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;document.body.classList.toggle("dark",prefersDark);}else if(t==="dark"){if(!document.body.classList.contains("dark"))toggleTheme();}else{if(document.body.classList.contains("dark"))toggleTheme();}localStorage.setItem("beme_theme_pref",t);};useEffect(()=>{const pref=localStorage.getItem("beme_theme_pref");if(pref)setSelected(pref);},[]);const THEMES=[{id:"light",label:"Light",icon:IC.sun},{id:"dark",label:"Dark",icon:IC.moon},{id:"system",label:"System",icon:IC.monitor}];
  return(<div style={{ maxWidth:520 }}><h2 className="ds-content-title">Preferences</h2><p className="ds-content-sub">Customise how the dashboard looks and feels.</p><div className="sd-panel"><div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}><div><div style={{ fontSize:14,fontWeight:700,color:"var(--sd-text)",marginBottom:3 }}>Appearance</div><div style={{ fontSize:12,color:"var(--sd-muted)" }}>Choose how the dashboard looks to you.</div></div><div style={{ display:"flex",background:"var(--sd-bg)",borderRadius:12,padding:4,gap:2,border:"1px solid var(--sd-border)" }}>{THEMES.map(t=>(<button key={t.id} onClick={()=>applyTheme(t.id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 12px",borderRadius:9,border:"none",background:selected===t.id?"var(--sd-white)":"transparent",cursor:"pointer",fontFamily:"var(--sd-font)",fontSize:11,fontWeight:600,color:selected===t.id?"var(--sd-text)":"var(--sd-muted)",boxShadow:selected===t.id?"0 1px 4px rgba(0,0,0,0.10)":"none",transition:"all 0.15s" }}><Ico d={t.icon} size={16} color={selected===t.id?"var(--sd-accent)":"var(--sd-muted)"}/>{t.label}</button>))}</div></div></div><div style={{ marginTop:16,padding:"14px 16px",borderRadius:12,background:"var(--sd-bg)",border:"1px solid var(--sd-border-light)",fontSize:12,color:"var(--sd-muted)",lineHeight:1.6 }}>System mode automatically switches between light and dark based on your device settings.</div></div>);}

// ── DELETE ACCOUNT TAB ──
function DeleteAccountTab(){
  const{user,logout}=useAuth();
  const navigate=useNavigate();
  const[confirm,setConfirm]=useState("");
  const[loading,setLoading]=useState(false);
  const[phase,setPhase]=useState("idle");
  const[err,setErr]=useState("");
  const handleDelete=async()=>{
    if(confirm!=="DELETE"){setErr("Please type DELETE exactly to confirm.");return;}
    setLoading(true);setErr("");
    try{
      if(user?.uid){
        const _apiBase=String(import.meta.env.VITE_BACKEND_URL||"").trim().replace(/\/+$/,"");
        await fetch(`${_apiBase}/api/sellers/delete-account`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:user.uid})}).catch(()=>{});
        await deleteDoc(doc(db,"users",user.uid)).catch(()=>{});
      }
      await logout().catch(()=>{});
      setPhase("done");
      setTimeout(()=>navigate("/"),2500);
    }catch(e){setErr(e.message||"Failed to delete account. Please contact support.");setLoading(false);}
  };
  if(phase==="done")return(<div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"60px 24px" }}><div style={{ fontSize:18,fontWeight:800,color:"var(--sd-text)",marginBottom:8 }}>Account Deleted</div><p style={{ fontSize:14,color:"var(--sd-muted)" }}>We're sorry to see you go. Redirecting you to the homepage…</p></div>);
  return(<div style={{ maxWidth:520 }}><h2 style={{ fontSize:20,fontWeight:800,color:"var(--sd-danger)",marginBottom:4,letterSpacing:"-0.02em" }}>Delete Account</h2><p className="ds-content-sub">Permanently remove your seller account and all associated data.</p><div style={{ padding:20,borderRadius:14,background:"var(--sd-danger-bg)",border:"1px solid rgba(185,28,28,0.2)",marginBottom:20 }}><div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:14 }}><Ico d={IC.alert} size={20} color="var(--sd-danger)"/><div style={{ fontSize:14,fontWeight:700,color:"var(--sd-danger)" }}>This action is permanent and cannot be undone.</div></div><ul style={{ margin:"0 0 0 20px",padding:0,fontSize:13,color:"var(--sd-danger)",lineHeight:1.8 }}><li>All your products will be removed</li><li>Your store page will go offline immediately</li><li>Pending withdrawals will be cancelled</li><li>All order history will be deleted</li><li>Your Beme account will be permanently closed</li></ul></div>{phase==="idle"&&(<><div style={{ padding:"14px 16px",borderRadius:12,background:"var(--sd-bg)",border:"1px solid var(--sd-border)",marginBottom:20,fontSize:13,color:"var(--sd-muted)",lineHeight:1.6 }}>If you have outstanding orders or pending withdrawals, please resolve them before deleting your account. Contact support if you need help.</div><button onClick={()=>setPhase("confirm")} style={{ padding:"11px 22px",borderRadius:10,border:"1.5px solid var(--sd-danger)",background:"transparent",color:"var(--sd-danger)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--sd-font)" }}>I understand, proceed to delete</button></>)}{phase==="confirm"&&(<div className="sd-panel"><div style={{ fontSize:14,fontWeight:700,color:"var(--sd-text)",marginBottom:4 }}>Final confirmation</div><p style={{ fontSize:13,color:"var(--sd-muted)",marginBottom:16 }}>Type <strong style={{ color:"var(--sd-danger)" }}>DELETE</strong> in the box below to permanently delete your account.</p><div className="sd-form-group"><input className="sd-input" placeholder="Type DELETE to confirm" value={confirm} onChange={e=>setConfirm(e.target.value)} style={{ borderColor:confirm==="DELETE"?"var(--sd-danger)":undefined }}/></div>{err&&<div style={{ padding:"10px 14px",borderRadius:8,background:"var(--sd-danger-bg)",color:"var(--sd-danger)",fontSize:13,fontWeight:600,marginBottom:14 }}>{err}</div>}<div style={{ display:"flex",gap:10 }}><button onClick={()=>{setPhase("idle");setConfirm("");setErr("");}} style={{ flex:1,padding:"12px",borderRadius:10,border:"1px solid var(--sd-border)",background:"transparent",color:"var(--sd-text)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--sd-font)" }}>Cancel</button><button onClick={handleDelete} disabled={loading||confirm!=="DELETE"} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",background:confirm==="DELETE"?"var(--sd-danger)":"var(--sd-border)",color:confirm==="DELETE"?"#fff":"var(--sd-muted)",fontSize:13,fontWeight:700,cursor:confirm==="DELETE"?"pointer":"not-allowed",fontFamily:"var(--sd-font)" }}>{loading?"Deleting…":"Delete My Account"}</button></div></div>)}</div>);
}

// ════════════════════════════════════════
//   NAV DATA
// ════════════════════════════════════════
const SECTIONS = [
  { group:"Account", items:[
    { id:"security",     label:"Security",            icon:IC.shield  },
    { id:"verification", label:"Verification",        icon:IC.verify  },
  ]},
  { group:"Store", items:[
    { id:"payment",      label:"Payment Preferences", icon:IC.lock    },
    { id:"ai",           label:"AI Capabilities",     icon:IC.sparkle },
  ]},
  { group:"Preferences", items:[
    { id:"preferences",  label:"Appearance",          icon:IC.sun     },
  ]},
  { group:"Danger Zone", items:[
    { id:"delete",       label:"Delete Account",      icon:IC.trash, danger:true },
  ]},
];

const TAB_CONTENT = {
  security:     <SecurityTab/>,
  verification: <VerificationTab/>,
  payment:      <PaymentPreferencesTab/>,
  ai:           <AICapabilitiesTab/>,
  preferences:  <PreferencesTab/>,
  delete:       <DeleteAccountTab/>,
};

// ════════════════════════════════════════
//   MAIN
// ════════════════════════════════════════
export default function DashboardSettings() {
  const [activeTab,  setActiveTab]  = useState("security");
  const [mobileView, setMobileView] = useState("list");

  const allItems   = SECTIONS.flatMap(s => s.items);
  const activeItem = allItems.find(i => i.id === activeTab);

  const handleNavClick = (id) => { setActiveTab(id); setMobileView("detail"); };
  const handleBack     = ()   => { setMobileView("list"); };

  const NavList = (
    <div className="ds-nav">
      <div className="ds-nav-title">Settings</div>
      {SECTIONS.map(sec => (
        <div key={sec.group} className="ds-nav-group">
          <div className="ds-nav-group-label">{sec.group}</div>
          {sec.items.map(item => (
            <button key={item.id}
              className={`ds-nav-btn${activeTab===item.id?" ds-nav-btn--active":""}${item.danger?" ds-nav-btn--danger":""}`}
              onClick={() => handleNavClick(item.id)}>
              <Ico d={item.icon} size={15}
                color={activeTab===item.id?(item.danger?"var(--sd-danger)":"var(--sd-accent)"):(item.danger?"var(--sd-danger)":"var(--sd-muted)")}/>
              <span className="ds-nav-btn-label">{item.label}</span>
              <Ico d={IC.chevR} size={14} color="var(--sd-muted)" className="ds-nav-chevron"/>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="ds-root">
      <div className={`ds-mobile-nav${mobileView==="list"?" ds-mobile-nav--visible":""}`}>{NavList}</div>
      <div className={`ds-mobile-detail${mobileView==="detail"?" ds-mobile-detail--visible":""}`}>
        <div className="ds-mobile-detail-header">
          <button onClick={handleBack} className="ds-back-btn"><Ico d={IC.chevL} size={18} color="var(--sd-text)"/></button>
          <span className="ds-mobile-detail-title">{activeItem?.label||"Settings"}</span>
        </div>
        <div className="ds-mobile-detail-body">{TAB_CONTENT[activeTab]}</div>
      </div>
      <div className="ds-desktop">
        <aside className="ds-desktop-aside">{NavList}</aside>
        <main className="ds-desktop-main">{TAB_CONTENT[activeTab]}</main>
      </div>
      <style>{`
        .ds-root{font-family:var(--sd-font,'DM Sans',system-ui,sans-serif);color:var(--sd-text);background:var(--sd-white);min-height:calc(100vh - 120px);position:relative;}
        .ds-nav{padding-bottom:24px;}
        .ds-nav-title{font-size:22px;font-weight:800;color:var(--sd-text);letter-spacing:-0.03em;margin-bottom:20px;}
        .ds-nav-group{margin-bottom:20px;}
        .ds-nav-group-label{font-size:10px;font-weight:700;color:var(--sd-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;padding-left:4px;}
        .ds-nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:10px 12px;border-radius:9px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--sd-text2);text-align:left;transition:background 0.12s;margin-bottom:2px;}
        .ds-nav-btn:hover:not(.ds-nav-btn--active){background:var(--sd-border-light);}
        .ds-nav-btn--active{background:var(--sd-accent-dim);color:var(--sd-accent);font-weight:700;}
        .ds-nav-btn--danger{color:var(--sd-danger)!important;}
        .ds-nav-btn--danger.ds-nav-btn--active{background:rgba(185,28,28,0.08);}
        .ds-nav-btn-label{flex:1;}
        .ds-nav-chevron{display:none;}
        .ds-content-title{font-size:20px;font-weight:800;color:var(--sd-text);margin-bottom:4px;letter-spacing:-0.02em;}
        .ds-content-sub{font-size:13px;color:var(--sd-muted);margin-bottom:24px;}
        .ds-desktop{display:none;}
        .ds-mobile-nav{display:block;}
        .ds-mobile-detail{display:none;}
        @media(min-width:769px){
          .ds-desktop{display:flex;gap:0;min-height:calc(100vh - 120px);}
          .ds-mobile-nav{display:none!important;}
          .ds-mobile-detail{display:none!important;}
          .ds-desktop-aside{width:220px;flex-shrink:0;padding-right:24px;border-right:1px solid var(--sd-border-light);}
          .ds-desktop-main{flex:1;padding-left:32px;padding-bottom:60px;min-width:0;}
          .ds-nav-chevron{display:none!important;}
        }
        @media(max-width:768px){
          .ds-mobile-nav{position:absolute;inset:0;background:var(--sd-white);overflow-y:auto;z-index:1;transform:translateX(-100%);transition:transform 0.26s cubic-bezier(0.4,0,0.2,1);padding:0;}
          .ds-mobile-nav--visible{transform:translateX(0);}
          .ds-nav-btn{padding:13px 14px;font-size:14px;border-radius:12px;}
          .ds-nav-chevron{display:flex!important;margin-left:auto;flex-shrink:0;}
          .ds-nav-group-label{padding-left:14px;}
          .ds-nav-title{padding:0 14px;font-size:24px;}
          .ds-nav{padding:8px 0 32px;}
          .ds-mobile-detail{position:absolute;inset:0;background:var(--sd-white);overflow-y:auto;z-index:2;transform:translateX(100%);transition:transform 0.26s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;}
          .ds-mobile-detail--visible{transform:translateX(0);}
          .ds-mobile-detail-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--sd-border-light);flex-shrink:0;background:var(--sd-white);position:sticky;top:0;z-index:10;}
          .ds-back-btn{width:34px;height:34px;border-radius:9px;flex-shrink:0;border:1px solid var(--sd-border);background:var(--sd-white);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.12s;}
          .ds-back-btn:hover{background:var(--sd-border-light);}
          .ds-mobile-detail-title{font-size:16px;font-weight:800;color:var(--sd-text);letter-spacing:-0.02em;}
          .ds-mobile-detail-body{flex:1;padding:20px 16px 60px;overflow-y:auto;}
          .ds-root{position:relative;overflow:hidden;min-height:calc(100vh - var(--sd-topbar-h,56px) - 48px);}
        }
      `}</style>
    </div>
  );
}