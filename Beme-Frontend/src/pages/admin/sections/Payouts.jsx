import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

function fmt(ts){if(!ts)return"—";const d=ts?.toDate?ts.toDate():new Date(ts);return d.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"});}
function titleize(v){return String(v||"").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());}

export default function PayoutsSection() {
  const { user, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [updating, setUpdating] = useState("");

  useEffect(() => {
    const q = query(collection(db,"payoutRequests"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => { setRequests(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }, e=>{console.error(e);setLoading(false);});
    return ()=>unsub();
  }, []);

  const filtered = useMemo(() => filter==="all"?requests:requests.filter(r=>(r.status||"pending")===filter), [requests,filter]);
  const counts = { all:requests.length, pending:requests.filter(r=>r.status==="pending").length, approved:requests.filter(r=>r.status==="approved").length, paid:requests.filter(r=>r.status==="paid").length };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await updateDoc(doc(db,"payoutRequests",id),{status,reviewedBy:user?.uid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}); }
    catch(e){console.error(e);}
    finally{setUpdating("");}
  };

  const STATUS_COLOR={pending:"amber",approved:"blue",paid:"green",rejected:"red"};

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Payout Requests</div>
        <div className="ap-page-sub">Review and approve seller payout requests</div>
      </div>

      <div className="ap-stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:14}}>
        {[["Total",counts.all],["Pending",counts.pending],["Approved",counts.approved],["Paid",counts.paid]].map(([l,v])=>(
          <div key={l} className="ap-stat" style={{padding:"14px 16px"}}><div className="ap-stat-label">{l}</div><div className="ap-stat-value" style={{fontSize:22}}>{v}</div></div>
        ))}
      </div>

      <div className="ap-filter-tabs" style={{marginBottom:14}}>
        {["all","pending","approved","paid","rejected"].map(f=>(
          <button key={f} className={`ap-filter-tab${filter===f?" ap-filter-tab--active":""}`} onClick={()=>setFilter(f)}>{titleize(f)}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {loading ? [1,2,3].map(i=><div key={i} className="ap-skeleton" style={{height:80,borderRadius:10}}/>) :
        filtered.length===0 ? <div className="ap-empty"><div className="ap-empty-title">No requests found</div></div> :
        filtered.map(r=>{
          const status = r.status||"pending";
          return (
            <div key={r.id} className="ap-card ap-card--p" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"var(--ap-text)"}}>#{r.id?.slice(0,8)}</span>
                  <span className={`ap-badge ap-badge--${STATUS_COLOR[status]||"gray"}`}>{status}</span>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:"var(--ap-text)",letterSpacing:"-0.02em"}}>GHS {Number(r.amount||0).toFixed(2)}</div>
                <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:4}}>{titleize(r.shop||"—")} · {r.shopAdminEmail||"—"} · {fmt(r.createdAt)}</div>
                {r.paymentDetails && <div style={{fontSize:12,color:"var(--ap-text2)",marginTop:4}}>Payment: {r.paymentDetails}</div>}
                {r.notes && <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:2}}>Notes: {r.notes}</div>}
              </div>
              {isSuperAdmin && (
                <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                  {["approved","paid","rejected"].map(s=>(
                    <button key={s} className={`ap-btn ap-btn--sm ap-btn--${s==="approved"?"secondary":s==="paid"?"success":"danger"}`}
                      onClick={()=>updateStatus(r.id,s)} disabled={updating===r.id||status===s}>
                      {titleize(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
