#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Backend/src/routes/orderRoutes.js","utf8").replace(/\r\n/g,"\n");

// Find where delivery is sanitized to understand current structure
const delIdx = src.indexOf("function sanitizeDelivery");
console.log("sanitizeDelivery at line:", src.slice(0,delIdx).split("\n").length);
console.log(src.slice(delIdx, delIdx + 300));
NODEEOF
