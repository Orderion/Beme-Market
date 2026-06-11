#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx","utf8").replace(/\r\n/g,"\n");

// Check current imports
const importLine = src.split("\n").find(l => l.includes("useState") && l.includes("import"));
console.log("Current import:", importLine);

// Add useEffect to the import if missing
if (!src.includes("useEffect")) {
  src = src.replace(
    'import { useState, useRef, useCallback } from "react";',
    'import { useState, useRef, useCallback, useEffect } from "react";'
  );
  console.log("✅ useEffect added to imports");
} else {
  console.log("✅ useEffect already imported");
}

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx", src.replace(/\n/g,"\r\n"),"utf8");
NODEEOF
