#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/DashboardHelp.jsx","utf8").replace(/\r\n/g,"\n");

// Remove 'where' import — no longer needed
src = src.replace(
  'import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";',
  'import { collection, onSnapshot, orderBy, query } from "firebase/firestore";'
);

// Replace the Firestore query (with where clause) with simple query + client-side filter
const OLD_QUERY = `    let q;
    if (sessionStart) {
      // New chat: only show messages from this session onward
      q = query(
        collection(db, "helpChats", user.uid, "messages"),
        orderBy("createdAt", "asc"),
        where("createdAt", ">=", Timestamp.fromDate(sessionStart))
      );
    } else {
      // Continue: show all messages
      q = query(
        collection(db, "helpChats", user.uid, "messages"),
        orderBy("createdAt", "asc")
      );
    }

    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));`;

const NEW_QUERY = `    // Always fetch all messages, filter client-side for new chat sessions
    const q = query(
      collection(db, "helpChats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, snap => {
      let msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // For new chat sessions, only show messages from sessionStart onward
      if (sessionStart) {
        const startMs = sessionStart.getTime();
        msgs = msgs.filter(m => {
          if (!m.createdAt) return false;
          let ms;
          if (typeof m.createdAt?.toMillis === "function") ms = m.createdAt.toMillis();
          else if (m.createdAt?.seconds) ms = m.createdAt.seconds * 1000;
          else if (m.createdAt instanceof Date) ms = m.createdAt.getTime();
          else ms = 0;
          return ms >= startMs;
        });
      }`;

if (src.includes("where(\"createdAt\"")) {
  src = src.replace(OLD_QUERY, NEW_QUERY);
  console.log("✅ Firestore where clause replaced with client-side filter");
} else {
  // Already fixed or different structure — just remove where/Timestamp imports
  console.log("ℹ️ where clause not found — checking imports only");
}

// Verify
const checks = [
  ["no where import",   !src.includes("where, Timestamp")],
  ["client filter",     src.includes("startMs = sessionStart.getTime()")],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/DashboardHelp.jsx", src.replace(/\n/g,"\r\n"),"utf8");
NODEEOF
