import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function useTutorial(pageKey) {
  const { user, subscriptionPlan } = useAuth(); // ← use auth, not useSubscription
  const [seen,    setSeen]    = useState(true);
  const [loading, setLoading] = useState(true);

  // Use plan from auth context — already loaded, no extra Firestore read
  const isPro = subscriptionPlan === "pro";

  useEffect(() => {
    if (!user?.uid || !isPro || !pageKey) { setLoading(false); return; }
    const ref = doc(db, "tutorialProgress", user.uid);
    getDoc(ref).then(snap => {
      if (!snap.exists()) { setSeen(false); }
      else { const data = snap.data() || {}; setSeen(!!data[pageKey]); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid, isPro, pageKey]);

  const markSeen = useCallback(async () => {
    if (!user?.uid || !pageKey) return;
    setSeen(true);
    try {
      await setDoc(doc(db,"tutorialProgress",user.uid),{ [pageKey]:true, updatedAt:serverTimestamp() },{ merge:true });
    } catch(e){ console.error(e); }
  }, [user?.uid, pageKey]);

  const resetTutorial = useCallback(async () => {
    if (!user?.uid || !pageKey) return;
    setSeen(false);
    try {
      await setDoc(doc(db,"tutorialProgress",user.uid),{ [pageKey]:false, updatedAt:serverTimestamp() },{ merge:true });
    } catch(e){ console.error(e); }
  }, [user?.uid, pageKey]);

  return { showTutorial: isPro && !loading && !seen, markSeen, resetTutorial, loading };
}