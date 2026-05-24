import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const DAILY_LIMIT = 15;
function today() { return new Date().toISOString().split("T")[0]; }

export function useAIUsage() {
  const { user } = useAuth();
  const [data, setData] = useState({ count:0, extraCredits:0, date:today() });
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if (!user?.uid) { setData({ count:0, extraCredits:0, date:today() }); setLoading(false); return; }
    const unsub = onSnapshot(doc(db,"aiUsage",user.uid),(snap)=>{
      if (!snap.exists()) { setData({ count:0, extraCredits:0, date:today() }); }
      else {
        const d = snap.data(); const t = today();
        if (d.date!==t) setData({ count:0, extraCredits:d.extraCredits||0, date:t });
        else setData({ count:d.count||0, extraCredits:d.extraCredits||0, date:d.date||t });
      }
      setLoading(false);
    },(err)=>{ console.error("[useAIUsage]",err); setLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  const extra    = data.extraCredits;
  const limit    = DAILY_LIMIT+extra;
  const used     = data.count;
  const remaining= Math.max(0,limit-used);
  const pct      = Math.min(100, Math.round((used/DAILY_LIMIT)*100));

  return { messagesUsed:used, messagesRemaining:remaining, extraCredits:extra, dailyLimit:DAILY_LIMIT, effectiveLimit:limit, isAtLimit:remaining===0, isNearLimit:!!(remaining>0&&remaining<=3), usagePercent:pct, loading };
}
