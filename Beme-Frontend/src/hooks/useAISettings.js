import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const DEFAULTS = { aiCustomerReplies:true, aiProductDescriptions:true, aiSeoOptimization:true, aiSalesSuggestions:true, aiMarketingAssistant:true, aiAnalyticsExplainer:true, aiFollowUpSuggestions:false, aiStoreHealthAnalysis:true };

export function useAISettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  useEffect(()=>{
    if (!user?.uid) { setSettings(DEFAULTS); setLoading(false); return; }
    const unsub = onSnapshot(doc(db,"aiSettings",user.uid),(snap)=>{
      setSettings(snap.exists()?{ ...DEFAULTS,...snap.data() }:DEFAULTS);
      setLoading(false);
    },(e)=>{ console.error(e); setLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  const updateSetting = useCallback(async(key,value)=>{
    if (!user?.uid) return;
    setSaving(true);
    try { await setDoc(doc(db,"aiSettings",user.uid),{ [key]:value, updatedAt:serverTimestamp() },{ merge:true }); }
    catch(e){ console.error(e); } finally { setSaving(false); }
  },[user?.uid]);

  return { settings, loading, saving, updateSetting };
}
