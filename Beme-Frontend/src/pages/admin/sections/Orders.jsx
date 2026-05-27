import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

function toMs(v){if(!v)return 0;if(typeof v?.toMillis==="function")return v.toMillis();if(typeof v?.seconds==="number")return v.seconds*1000;return 0;}
function fmtDate(v){if(!v)return"—";try{const d=typeof v?.toDate==="function"?v.toDate():new Date(v);return new Intl.DateTimeFormat("en-GH",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d);}catch{return"—";}}
function orderTotal(o){const d=o?.pricing?.total??o?.total??o?.amount??o?.grandTotal??o?.subtotal;if(Number.isFinite(Number(d)))return Number(d);return(o?.items||[]).reduce((s,i)=>s+Number(i?.price||0)*Number(i?.qty||0),0);}

const STATUSES=["all","pending","pending_payment","paid","processing","shipped","delivered","cancelled","payment_failed"];
const STATUS_COLOR={pending:"amber",pending_payment:"amber",paid:"green",processing:"blue",shipped:"blue",delivered:"green",cancelled:"red",payment_failed:"red"};

export default function OrdersSection() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [updating,setUpdating]= useState("");

  useEffect(() => {
    const q = query(collection(db,"orders"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = filter==="all" ? orders : orders.filter(o=>(o.status||"pending")===filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(o => [o.id,o.customer?.firstName,o.customer?.lastName,o.customer?.phone,o.customer?.email,o.status,o.reference].join(" ").toLowerCase().includes(q));
    return list;
  }, [orders, filter, search]);

  const summary = useMemo(() => ({
    total: filtered.length,
    revenue: filtered.reduce((s,o)=>s+orderTotal(o),0),
    paid: filtered.filter(o=>o.paid===true||o.paymentStatus==="paid"||o.status==="paid").length,
    delivered: filtered.filter(o=>o.status==="delivered").length,
  }), [filtered]);

  const setStatus = async (id, status) => {
    setUpdating(id);
    try { await updateDoc(doc(db,"orders",id),{status,updatedAt:serverTimestamp()}); }
    catch(e) { console.error(e); }
    finally { setUpdating(""); }
  };

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Orders</div>
        <div className="ap-page-sub">All platform orders · real-time updates</div>
      </div>

      <div className="ap-stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:14}}>
        {[["Visible Orders",summary.total],["Revenue",`GHS ${summary.revenue.toFixed(2)}`],["Paid",summary.paid],["Delivered",summary.delivered]].map(([l,v])=>(
          <div key={l} className="ap-stat" style={{padding:"14px 16px"}}>
            <div className="ap-stat-label">{l}</div>
            <div className="ap-stat-value" style={{fontSize:22}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div className="ap-search" style={{maxWidth:320}}>
          <input className="ap-input" placeholder="Search ID, customer, status…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:12}}/>
        </div>
        <div className="ap-filter-tabs" style={{flexWrap:"wrap"}}>
          {STATUSES.map(s=>(
            <button key={s} className={`ap-filter-tab${filter===s?" ap-filter-tab--active":""}`} onClick={()=>setFilter(s)}>{s==="all"?"All":s}</button>
          ))}
        </div>
      </div>

      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>
            {loading ? [1,2,3,4].map(i=><tr key={i}>{[1,2,3,4,5,6,7].map(j=><td key={j}><div className="ap-skeleton" style={{height:16,borderRadius:4}}/></td>)}</tr>) :
            filtered.length===0 ? <tr><td colSpan={7}><div className="ap-empty"><div className="ap-empty-title">No orders found</div></div></td></tr> :
            filtered.map(o => {
              const s = o.status || "pending";
              const name = `${o.customer?.firstName||""} ${o.customer?.lastName||""}`.trim()||o.customerName||"Customer";
              const items = (o.items||[]);
              return (
                <tr key={o.id}>
                  <td><span style={{fontFamily:"monospace",fontSize:12,color:"var(--ap-text)",fontWeight:600}}>#{o.id?.slice(0,8).toUpperCase()}</span></td>
                  <td>
                    <div style={{fontSize:13,color:"var(--ap-text)",fontWeight:500}}>{name}</div>
                    <div style={{fontSize:11,color:"var(--ap-muted)"}}>{o.customer?.phone||o.customer?.email||""}</div>
                  </td>
                  <td><span style={{fontSize:12,color:"var(--ap-text2)"}}>{items.length} item{items.length!==1?"s":""}</span></td>
                  <td><span style={{fontSize:13,fontWeight:700,color:"var(--ap-text)"}}>GHS {orderTotal(o).toFixed(2)}</span></td>
                  <td><span style={{fontSize:12,color:"var(--ap-muted)"}}>{fmtDate(o.createdAt)}</span></td>
                  <td><span className={`ap-badge ap-badge--${STATUS_COLOR[s]||"gray"}`}>{s}</span></td>
                  <td>
                    <select
                      value={s}
                      onChange={e=>setStatus(o.id,e.target.value)}
                      disabled={updating===o.id}
                      style={{background:"rgba(255,255,255,0.04)",border:"1px solid var(--ap-border2)",borderRadius:7,color:"var(--ap-text2)",fontSize:12,padding:"5px 8px",fontFamily:"var(--ap-font)",cursor:"pointer",outline:"none"}}
                    >
                      {STATUSES.filter(s=>s!=="all").map(st=><option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:8}}>{filtered.length} order{filtered.length!==1?"s":""} shown</div>
    </div>
  );
}
