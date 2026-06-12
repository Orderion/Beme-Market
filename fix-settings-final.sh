#!/usr/bin/env bash
# Fixes the broken DeleteAccountTab in DashboardSettings.jsx
# Run from project root: bash fix-settings-final.sh

set -e

ROOT="$PWD"
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardSettings.jsx"

if [[ ! -f "$F" ]]; then
  echo "ERROR: File not found"
  exit 1
fi

cp "$F" "$F.bak3-final"
echo "Backup: DashboardSettings.jsx.bak3-final"

TMPJS="${TMPDIR:-/tmp}/fix_settings_final_$$.js"

cat > "$TMPJS" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

// The broken block — these 3 lines got inserted outside the function
const BROKEN = `// ── DELETE ACCOUNT TAB ──
const _apiBase = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\\/+$/, "");
await fetch(\`\${_apiBase}/api/sellers/delete-account\`,`;

// What it should be — just the comment, the function declaration follows on the next line
const FIXED = `// ── DELETE ACCOUNT TAB ──`;

if (!content.includes(BROKEN)) {
  console.error('BROKEN_BLOCK_NOT_FOUND');
  process.exit(1);
}

content = content.replace(BROKEN, FIXED);

// Now fix the handleDelete inside the function — find the old broken fetch and restore it
// The line after the broken block still has the fetch options missing, so we need to
// find the mangled function body and fix the handleDelete call.
// The function starts with: function DeleteAccountTab(){
// Inside it, handleDelete has: await fetch(...  but now points to backtick URL without options

// Find and fix the fetch call inside handleDelete — it currently reads:
// await fetch(`${_apiBase}/api/sellers/delete-account`,
// followed immediately by if(phase==="done")
// We need to restore the full original fetch line inside handleDelete

const BROKEN_FETCH = "await fetch(`${_apiBase}/api/sellers/delete-account`,\n  if(phase===\"done\")";
const FIXED_FETCH  = `await fetch(\`\${String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\\/+$/, "")}/api/sellers/delete-account\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:user.uid})}).catch(()=>{});\n  if(phase===\"done\")`;

if (content.includes(BROKEN_FETCH)) {
  content = content.replace(BROKEN_FETCH, FIXED_FETCH);
  console.log('BOTH_FIXED');
} else {
  // Already has the comment-only fix, just write what we have
  console.log('COMMENT_FIXED_ONLY');
}

fs.writeFileSync(filePath, content, 'utf8');
ENDJS

RESULT=$(node "$TMPJS" "$F" 2>&1)
rm -f "$TMPJS"

echo "Node result: $RESULT"

# Verify — should not have the broken lines anymore
if grep -qF 'await fetch(`${_apiBase}' "$F"; then
  echo "ERROR: Broken lines still present"
  cp "$F.bak3-final" "$F"
  echo "Restored from backup"
  exit 1
else
  echo "✓ Fixed — DashboardSettings.jsx is clean"
fi
