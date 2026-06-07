#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/api.js';
let src = fs.readFileSync(path, 'utf8');

// Increase timeout from 15s to 60s
src = src.replace(
  'setTimeout(() => controller.abort(), 15000)',
  'setTimeout(() => controller.abort(), 60000)'
);

// Also increase waitForAuthReady from 8s to 12s
src = src.replace(
  'function waitForAuthReady(timeoutMs = 8000)',
  'function waitForAuthReady(timeoutMs = 12000)'
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ Timeout increased: fetch 15s→60s, auth 8s→12s');

// Verify
const t = src.match(/controller\.abort\(\), (\d+)/)?.[1];
console.log('Fetch timeout now:', t + 'ms');
NODEEOF

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/services/api.js"
echo "  git commit -m 'fix: increase fetch timeout to 60s for Render cold starts'"
echo "  git push"
