#!/usr/bin/env bash
# Fixes DashboardSettings.jsx hardcoded URL — run from project root
# Usage: bash fix-settings-patch.sh

set -e

ROOT="$PWD"
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardSettings.jsx"

if [[ ! -f "$F" ]]; then
  echo "ERROR: File not found: $F"
  exit 1
fi

if ! grep -qF 'beme-market-1.onrender.com/api/sellers/delete-account' "$F"; then
  echo "Already patched or string not found — nothing to do."
  exit 0
fi

cp "$F" "$F.bak3-settings"
echo "Backup created: DashboardSettings.jsx.bak3-settings"

TMPJS="${TMPDIR:-/tmp}/fix_settings_$$.js"

cat > "$TMPJS" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];

let content = fs.readFileSync(filePath, 'utf8');

// The original minified line contains the full fetch call on one line.
// We only replace the URL string, leaving everything else intact.
const OLD = '"https://beme-market-1.onrender.com/api/sellers/delete-account"';
const NEW = '`${String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\\/+$/, "")}/api/sellers/delete-account`';

if (!content.includes(OLD)) {
  console.error('ERROR: target string not found');
  process.exit(1);
}

content = content.replace(OLD, NEW);
fs.writeFileSync(filePath, content, 'utf8');
console.log('PATCH_OK');
ENDJS

RESULT=$(node "$TMPJS" "$F" 2>&1)
rm -f "$TMPJS"

if [[ "$RESULT" == "PATCH_OK" ]]; then
  echo "✓ Applied — hardcoded URL replaced with VITE_BACKEND_URL"
else
  echo "ERROR: $RESULT"
  cp "$F.bak3-settings" "$F"
  echo "Restored from backup."
  exit 1
fi
