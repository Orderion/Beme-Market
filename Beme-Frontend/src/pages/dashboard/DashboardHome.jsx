import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

function fmtMoney(n) {
  const v = Number(n||0);
  if (v>=1000000) return `${(v/1000000).toFixed(1)}M`;
  if (v>=1000)    return `${(v/1000).toFixed(1)}k`;
  return v.toFixed(2);
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH",{day:"numeric",month:"short"});
}
function startOfWeek()     { const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return Timestamp.fromDate(d); }
function startOfMonth()    { const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return Timestamp.fromDate(d); }
function startOfLastMonth(){ const d=new Date();d.setDate(1);d.setHours(0,0,0,0);d.setMonth(d.getMonth()-1);return Timestamp.fromDate(d); }
function pct(c,p)          { if(!p)return c>0?100:0;return Math.round(((c-p)/p)*100); }
function initials(name)    { if(!name)return "?";const p=name.trim().split(" ");return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():name.slice(0,2).toUpperCase(); }

const DAY=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STATUS_COLOR={paid:"#22C55E",delivered:"#22C55E",processing:"#046EF2",shipped:"#7C3AED",pending:"#F59E0B",cancelled:"#EF4444"};
const AVATAR_PAL=["#046EF2","#7C3AED","#22C55E","#F59E0B","#EF4444","#0891B2"];

function Ico({d,size=14,color="currentColor"}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg,i)=><path key={i} d={seg}/>)}
    </svg>
  );
}
const IC={
  rev:  "M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  ord:  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  chk:  "M22 11.08V12a10 10 0 11-5.93-9.14|M22 4L12 14.01l-3-3",
  usr:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
  arr:  "M23 6L13.5 15.5 8.5 10.5 1 18|M17 6h6v6",
  up:   "M18 15l-6-6-6 6",
  dn:   "M6 9l6 6 6-6",
};

function MetricCard({label,value,pctVal,icon,iconColor="#111",loading}) {
  const up = pctVal>=0;
  const barW = Math.min(Math.abs(pctVal),100);
  return (
    <div style={{
      background: "#fff",
      borderRadius:16, padding:"20px 20px 16px",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.07em",color:"#9CA3AF"}}>
          {label}
        </span>
        <div style={{width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
          background:iconColor+"12",color:iconColor}}>
          <Ico d={icon} size={14}/>
        </div>
      </div>
      {loading
        ? <div style={{height:34,width:"55%",borderRadius:6,background:"rgba(0,0,0,0.07)",marginBottom:10}}/>
        : <div style={{fontSize:28,fontWeight:900,color:"#111",letterSpacing:"-0.04em",lineHeight:1,marginBottom:10}}>
            {value}
          </div>
      }
      <div style={{height:4,background:"rgba(0,0,0,0.07)",borderRadius:2,overflow:"hidden",marginBottom:8}}>
        {!loading && <div style={{height:"100%",width:`${barW}%`,background:iconColor,borderRadius:2,transition:"width 0.7s ease"}}/>}
      </div>
      {!loading && (
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700}}>
          <span style={{display:"flex",alignItems:"center",gap:2,color:up?"#22C55E":"#EF4444"}}>
            <Ico d={up?IC.up:IC.dn} size={10} color={up?"#22C55E":"#EF4444"}/>
            {Math.abs(pctVal)}%
          </span>
          <span style={{color:"#9CA3AF",fontWeight:500}}>vs last month</span>
        </div>
      )}
    </div>
  );
}

function Tabs({value,options,onChange}) {
  return (
    <div style={{display:"flex",background:"#f5f5f5",borderRadius:100,padding:3,border:"1px solid rgba(0,0,0,0.07)"}}>
      {options.map(o=>(
        <button key={o.v} type="button" onClick={()=>onChange(o.v)}
          style={{padding:"5px 12px",borderRadius:100,border:"none",
            background:value===o.v?"#fff":"transparent",
            color:value===o.v?"#111":"#9CA3AF",
            fontSize:12,fontWeight:700,cursor:"pointer",
            boxShadow:value===o.v?"0 1px 4px rgba(0,0,0,0.1)":"none",
            transition:"all 0.15s",fontFamily:"inherit"}}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Tip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  const k = payload[0]?.dataKey;
  const v = payload[0]?.value;
  return (
    <div style={{background:"#fff",border:"1px solid rgba(0,0,0,0.08)",borderRadius:10,
      padding:"10px 14px",fontSize:12,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
      <div style={{color:"#9CA3AF",marginBottom:4}}>{label}</div>
      <div style={{color:"#111"}}>{k==="revenue"?`GHS ${Number(v).toFixed(2)}`:v+" orders"}</div>
    </div>
  );
}

export default function DashboardHome() {
  const { showTutorial, markSeen } = useTutorial("home");
  const {user}                         = useAuth();
  const {shop,storeId,subscriptionPlan} = useSellerAuth();
  const [orders,    setOrders]    = useState([]);
  const [lastOrds,  setLastOrds]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [chartMode, setChartMode] = useState("orders");

  useEffect(()=>{
    const sid=storeId||shop?.id;
    if(!sid&&!user?.uid) return;
    setLoading(true);
    const run=async()=>{
      try {
        const snap=await getDocs(query(collection(db,"orders"),
          where("sellerId","==",sid||user.uid),
          where("createdAt",">=",startOfLastMonth()),
          orderBy("createdAt","desc"),limit(200)));
        const all=snap.docs.map(d=>({id:d.id,...d.data()}));
        const ms=startOfMonth().toMillis(), lms=startOfLastMonth().toMillis();
        setOrders(all.filter(o=>(o.createdAt?.toMillis?.()||0)>=ms));
        setLastOrds(all.filter(o=>{const t=o.createdAt?.toMillis?.()||0;return t>=lms&&t<ms;}));
      } catch(e){console.error("[DH]",e);}
      finally{setLoading(false);}
    };
    run();
  },[storeId,shop?.id,user?.uid]);

  const m = useMemo(()=>{
    const ws=startOfWeek().toMillis(), lws=ws-7*86400000;
    const wkO=orders.filter(o=>(o.createdAt?.toMillis?.()||0)>=ws);
    const pwO=lastOrds.filter(o=>{const t=o.createdAt?.toMillis?.()||0;return t>=lws&&t<ws;});
    const rev=orders.reduce((s,o)=>s+Number(o.pricing?.total||0),0);
    const pRev=lastOrds.reduce((s,o)=>s+Number(o.pricing?.total||0),0);
    const apr=orders.filter(o=>["paid","delivered","processing","shipped"].includes(o.status));
    const pApr=lastOrds.filter(o=>["paid","delivered","processing","shipped"].includes(o.status));
    const custs=new Set(orders.map(o=>o.userId||o.customer?.email)).size;
    const pCusts=new Set(lastOrds.map(o=>o.userId||o.customer?.email)).size;
    const today=new Date();
    const bar=Array.from({length:7},(_,i)=>{
      const d=new Date(today);d.setDate(today.getDate()-(6-i));d.setHours(0,0,0,0);
      const nx=new Date(d);nx.setDate(d.getDate()+1);
      const slice=orders.filter(o=>{const t=o.createdAt?.toMillis?.()||0;return t>=d.getTime()&&t<nx.getTime();});
      return{day:DAY[d.getDay()],orders:slice.length,revenue:slice.reduce((s,o)=>s+Number(o.pricing?.total||0),0)};
    });
    const recent=[...orders].sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,5);
    return{wkO:wkO.length,pwO:pwO.length,rev,pRev,apr:apr.length,pApr:pApr.length,custs,pCusts,
      total:orders.length,avg:orders.length?rev/orders.length:0,bar,recent};
  },[orders,lastOrds]);

  const dateStr=new Date().toLocaleDateString("en-GH",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  return (
    <div style={{fontFamily:"var(--font-main,'Nunito',sans-serif)", background:"#fff"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:"#111",letterSpacing:"-0.03em",lineHeight:1.1}}>Analytics</div>
          <div style={{fontSize:13,color:"#9CA3AF",fontWeight:500,marginTop:3}}>{dateStr}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:"#22C55E",
          background:"rgba(34,197,94,0.08)",padding:"6px 12px",borderRadius:100,border:"1px solid rgba(34,197,94,0.2)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22C55E"}}/>
          Store Active
        </div>
      </div>

      {/* 4 metric cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:10}}>
        <MetricCard label="Revenue (Month)" value={`GHS ${fmtMoney(m.rev)}`} pctVal={pct(m.rev,m.pRev)} icon={IC.rev} iconColor="#046EF2" loading={loading}/>
        <MetricCard label="Orders (Week)"   value={m.wkO}                   pctVal={pct(m.wkO,m.pwO)} icon={IC.ord} iconColor="#7C3AED" loading={loading}/>
        <MetricCard label="Approved"        value={m.apr}                   pctVal={pct(m.apr,m.pApr)} icon={IC.chk} iconColor="#22C55E" loading={loading}/>
        <MetricCard label="Customers"       value={m.custs}                 pctVal={pct(m.custs,m.pCusts)} icon={IC.usr} iconColor="#F59E0B" loading={loading}/>
      </div>

      {/* 2 mini strips */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        {[
          {label:"Total Orders",    val:m.total,                    color:"#046EF2", icon:IC.arr},
          {label:"Avg. Order Value",val:`GHS ${fmtMoney(m.avg)}`,   color:"#7C3AED", icon:IC.rev},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",borderRadius:12,
            border:"1px solid rgba(0,0,0,0.08)",padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:s.color+"10",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",color:s.color}}>
              <Ico d={s.icon} size={15}/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",color:"#9CA3AF"}}>{s.label}</div>
              {loading
                ?<div style={{height:16,width:50,background:"rgba(0,0,0,0.07)",borderRadius:4,marginTop:4}}/>
                :<div style={{fontSize:16,fontWeight:900,color:"#111",letterSpacing:"-0.03em",lineHeight:1.2}}>{s.val}</div>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(0,0,0,0.08)",padding:"18px 20px 14px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:800,color:"#111"}}>
            {chartMode==="orders"?"Orders":"Revenue"} — Last 7 Days
          </span>
          <Tabs value={chartMode} options={[{v:"orders",l:"Orders"},{v:"revenue",l:"Revenue"}]} onChange={setChartMode}/>
        </div>
        {loading
          ?<div style={{height:150,background:"rgba(0,0,0,0.04)",borderRadius:8}}/>
          :m.bar.every(d=>(chartMode==="orders"?d.orders:d.revenue)===0)
            ?<div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
               <span style={{fontSize:13,color:"#9CA3AF",fontWeight:600}}>No data this week yet</span>
             </div>
            :<ResponsiveContainer width="100%" height={150}>
               <BarChart data={m.bar} barSize={26}>
                 <XAxis dataKey="day" tick={{fontSize:11,fill:"#9CA3AF",fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                 <YAxis tick={{fontSize:11,fill:"#9CA3AF",fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                 <Tooltip content={<Tip/>} cursor={{fill:"rgba(0,0,0,0.03)"}}/>
                 <Bar dataKey={chartMode} radius={[6,6,0,0]} fill="#111"/>
               </BarChart>
             </ResponsiveContainer>
        }
      </div>

      {/* Order list */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(0,0,0,0.08)",padding:"18px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:800,color:"#111"}}>Order List</span>
          <span style={{fontSize:11,fontWeight:600,color:"#9CA3AF"}}>{m.total} orders this month</span>
        </div>

        {loading
          ?[1,2,3].map(i=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
                <div style={{width:38,height:38,borderRadius:9,background:"rgba(0,0,0,0.07)",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{height:11,width:"55%",background:"rgba(0,0,0,0.07)",borderRadius:4,marginBottom:5}}/>
                  <div style={{height:9,width:"35%",background:"rgba(0,0,0,0.05)",borderRadius:4}}/>
                </div>
              </div>
            ))
          :m.recent.length===0
            ?<div style={{textAlign:"center",padding:"28px 0"}}>
               <div style={{fontSize:13,color:"#9CA3AF",fontWeight:600}}>No orders yet</div>
               <div style={{fontSize:12,color:"#9CA3AF",marginTop:3}}>Your first order will appear here.</div>
             </div>
            :m.recent.map((o,i)=>{
               const cust=o.customer;
               const name=[cust?.firstName,cust?.lastName].filter(Boolean).join(" ")||"Customer";
               const ini=initials(name);
               const av=AVATAR_PAL[i%AVATAR_PAL.length];
               const st=o.status||"pending";
               const badge=st==="paid"||st==="delivered"?"Completed":st==="pending"?"New Order":st.charAt(0).toUpperCase()+st.slice(1);
               return (
                 <div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                   borderBottom:i<m.recent.length-1?"1px solid rgba(0,0,0,0.05)":"none"}}>
                   <div style={{width:38,height:38,borderRadius:9,background:av,flexShrink:0,
                     display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>
                     {ini}
                   </div>
                   <div style={{flex:1,minWidth:0}}>
                     <div style={{fontSize:13,fontWeight:700,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                     <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500}}>{fmtDate(o.createdAt)}</div>
                   </div>
                   <div style={{fontSize:13,fontWeight:800,color:"#111",flexShrink:0}}>
                     +GHS {Number(o.pricing?.total||0).toFixed(2)}
                   </div>
                   <div style={{padding:"4px 10px",borderRadius:100,flexShrink:0,fontSize:11,fontWeight:700,
                     background:(STATUS_COLOR[st]||"#9CA3AF")+"15",color:STATUS_COLOR[st]||"#9CA3AF"}}>
                     {badge}
                   </div>
                 </div>
               );
             })
        }
      </div>

      {/* New store hint */}
      {!loading&&m.total===0&&(
        <div style={{marginTop:14,padding:"14px 18px",borderRadius:12,
          background:"rgba(0,0,0,0.03)",border:"1px solid rgba(0,0,0,0.08)",
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:9,background:"rgba(0,0,0,0.07)",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#111",flexShrink:0}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#111"}}>Your store is live — start listing products!</div>
            <div style={{fontSize:12,color:"#6B7280",fontWeight:500,marginTop:2}}>Go to <strong>Products</strong> to add your first product.</div>
          </div>
        </div>
      )}
    {showTutorial && (
      <TutorialOverlay
        steps={TUTORIAL_STEPS.home}
        onFinish={markSeen}
        pageTitle="Dashboard Home"
      />
    )}
    </div>
  );
}