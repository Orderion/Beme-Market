import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Invoice() {
  const { reference }    = useParams();
  const [data,  setData] = useState(null);
  const [error, setError]= useState("");

  useEffect(() => {
    if (!reference) { setError("Invalid invoice reference."); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db,"subscriptionAttempts", reference));
        if (!snap.exists()) { setError("Invoice not found."); return; }
        setData(snap.data());
      } catch(e) { setError("Could not load invoice."); }
    })();
  }, [reference]);

  if (error) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"sans-serif",color:"#111",flexDirection:"column",gap:12}}>
      <div style={{fontSize:18,fontWeight:700}}>Invoice not found</div>
      <div style={{fontSize:14,color:"#9ca3af"}}>{error}</div>
    </div>
  );

  if (!data) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,border:"3px solid #e8eaed",borderTopColor:"#1a6ef5",
        borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const planName  = (data.planId||"starter").charAt(0).toUpperCase()+(data.planId||"starter").slice(1);
  const billing   = data.billing==="yearly" ? "Yearly" : "Monthly";
  const amountGHS = (data.amountKobo||0)/100;
  const paidDate  = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString("en-GH",{day:"numeric",month:"long",year:"numeric"})
    : new Date().toLocaleDateString("en-GH",{day:"numeric",month:"long",year:"numeric"});

  return (
    <div style={{minHeight:"100vh",background:"#f5f7fa",fontFamily:"'DM Sans',system-ui,sans-serif",
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>

      <div id="invoice-card" style={{background:"#fff",borderRadius:20,padding:"48px 44px",
        maxWidth:540,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,0.10)"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{width:48,height:48,borderRadius:12,flexShrink:0,
            background:"linear-gradient(135deg,#1a6ef5,#7C3AED)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontWeight:900,fontSize:20}}>B</span>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:"#111",letterSpacing:"-0.02em"}}>Beme Market</div>
            <div style={{fontSize:12,color:"#9ca3af"}}>bememarket.store</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em"}}>Invoice</div>
            <div style={{fontSize:13,fontWeight:800,color:"#1a6ef5"}}>#{reference?.slice(0,12)?.toUpperCase()}</div>
          </div>
        </div>

        {/* Status */}
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",
          borderRadius:20,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",
          marginBottom:28}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#22C55E"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>Payment Successful</span>
        </div>

        {/* Info rows */}
        {[
          ["Plan",           `${planName} Plan`],
          ["Billing Period", billing],
          ["Amount Paid",    `GHS ${amountGHS.toFixed(2)}`],
          ["Date",           paidDate],
          ["Reference",      reference],
          ["Status",         "Paid ✓"],
        ].map(([l,v],i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"12px 0",borderBottom:"1px solid #f0f0f0"}}>
            <span style={{fontSize:14,color:"#9ca3af",fontWeight:600}}>{l}</span>
            <span style={{fontSize:14,fontWeight:800,color:l==="Amount Paid"?"#1a6ef5":"#111"}}>{v}</span>
          </div>
        ))}

        {/* Total */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"16px 0",marginTop:4}}>
          <span style={{fontSize:16,fontWeight:900,color:"#111"}}>Total</span>
          <span style={{fontSize:20,fontWeight:900,color:"#1a6ef5",letterSpacing:"-0.03em"}}>
            GHS {amountGHS.toFixed(2)}
          </span>
        </div>

        {/* Print button */}
        <button onClick={() => window.print()}
          style={{width:"100%",padding:"13px",marginTop:24,borderRadius:12,border:"none",
            background:"#1a6ef5",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",
            fontFamily:"inherit",boxShadow:"0 4px 14px rgba(26,110,245,0.3)"}}>
          Print Invoice
        </button>

        <p style={{textAlign:"center",fontSize:12,color:"#9ca3af",marginTop:12,fontWeight:500}}>
          Beme Market · Accra, Ghana · support@bememarket.store
        </p>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media print{
          body{background:#fff!important;}
          button{display:none!important;}
          #invoice-card{box-shadow:none!important;border:1px solid #e8eaed!important;}
        }
      `}</style>
    </div>
  );
}
