#!/usr/bin/env bash
# ============================================================
# BEME MARKET — PATCH 4 ONLY
# Fixes AdminPanel.jsx admin AI assistant
# Run from project root: bash apply-patch4.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

echo ""
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Beme Market — Patch 4 (AdminPanel AI)   ${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""

# ── Resolve project root ──────────────────────────────────────
ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done

if [[ ! -f "$ROOT/package.json" ]]; then
  echo -e "${RED}ERROR: Could not find project root.${NC}"
  exit 1
fi

echo -e "Project root: ${CYAN}$ROOT${NC}"

F_ADMIN="$ROOT/Beme-Frontend/src/pages/admin/AdminPanel.jsx"

# ── Check file exists ─────────────────────────────────────────
if [[ ! -f "$F_ADMIN" ]]; then
  fail "File not found: Beme-Frontend/src/pages/admin/AdminPanel.jsx"
  exit 1
fi

# ── Check if already patched ──────────────────────────────────
if grep -qF '/api/ai/chat' "$F_ADMIN"; then
  warn "Already patched — /api/ai/chat already present. Nothing to do."
  echo ""
  exit 0
fi

# ── Check target string exists ────────────────────────────────
if ! grep -qF 'api.anthropic.com/v1/messages' "$F_ADMIN"; then
  warn "Target string not found in AdminPanel.jsx — file may differ."
  warn "Apply Patch 4 manually using PATCH_INSTRUCTIONS.md"
  exit 1
fi

# ── Backup ────────────────────────────────────────────────────
cp "$F_ADMIN" "$F_ADMIN.bak3-p4"
info "Backup: AdminPanel.jsx.bak3-p4"

# ── Write Node.js patcher to a temp file ─────────────────────
TMPJS="${TMPDIR:-/tmp}/beme_patch4_$$.js"

cat > "$TMPJS" << 'ENDJS'
const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error('ERROR: no file path argument');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

const OLD_FETCH = 'const res = await fetch("https://api.anthropic.com/v1/messages"';
const OLD_SET   = 'setAiMessages(prev=>[...prev,{role:"ai",text:data.content?.[0]?.text||"Sorry, try again."}]);';

if (!content.includes(OLD_FETCH)) {
  console.error('PATCH_FAIL: fetch target line not found');
  process.exit(1);
}

const lines = content.split('\n');
let fetchLineIdx = -1;
let setLineIdx   = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(OLD_FETCH)) fetchLineIdx = i;
  if (lines[i].includes(OLD_SET))   setLineIdx   = i;
}

if (fetchLineIdx === -1 || setLineIdx === -1) {
  console.error('PATCH_FAIL: could not locate both target lines');
  console.error('  fetch line index : ' + fetchLineIdx);
  console.error('  setState line idx: ' + setLineIdx);
  process.exit(1);
}

const indent = lines[fetchLineIdx].match(/^(\s*)/)[1];

const replacement = [
  indent + 'const _apiBase = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\\/+$/, "");',
  indent + 'const res = await fetch(`${_apiBase}/api/ai/chat`, {',
  indent + '  method: "POST",',
  indent + '  headers: { "Content-Type": "application/json" },',
  indent + '  body: JSON.stringify({',
  indent + '    messages: [',
  indent + '      ...aiMessages.filter((_,i) => i > 0).map(m => ({',
  indent + '        role: m.role === "ai" ? "assistant" : "user",',
  indent + '        content: m.text,',
  indent + '      })),',
  indent + '      { role: "user", content: text },',
  indent + '    ],',
  indent + '    context: { currentPage: "admin", systemOverride: ctx },',
  indent + '  }),',
  indent + '});',
  indent + 'const data = await res.json();',
  indent + 'setAiMessages(prev => [...prev, { role:"ai", text: data.content || data.reply || "Sorry, try again." }]);',
];

lines.splice(fetchLineIdx, setLineIdx - fetchLineIdx + 1, ...replacement);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('PATCH_OK');
ENDJS

# ── Run the patcher ───────────────────────────────────────────
echo ""
RESULT=$(node "$TMPJS" "$F_ADMIN" 2>&1)
EXIT_CODE=$?

rm -f "$TMPJS"

if [[ $EXIT_CODE -ne 0 ]]; then
  fail "Node.js patcher failed:"
  echo "  $RESULT"
  echo ""
  warn "Restore backup and apply manually:"
  echo "  cp \"$F_ADMIN.bak3-p4\" \"$F_ADMIN\""
  echo "  Then open PATCH_INSTRUCTIONS.md for the manual steps."
  exit 1
fi

# ── Verify result ─────────────────────────────────────────────
if grep -qF '/api/ai/chat' "$F_ADMIN" && ! grep -qF 'api.anthropic.com/v1/messages' "$F_ADMIN"; then
  ok "Applied — admin AI now routes through /api/ai/chat"
  echo ""
  echo -e "${GREEN}All 4 patches complete.${NC}"
  echo ""
  echo "Now copy the 2 full file replacements (SellerDashboard.jsx + adminReview.js)"
  echo "then push:"
  echo ""
  echo -e "  ${CYAN}git add -A${NC}"
  echo -e "  ${CYAN}git commit -m \"Build 3: fix SellerDashboard crash, adminReview revocation, broken links, admin AI\"${NC}"
  echo -e "  ${CYAN}git push${NC}"
else
  fail "Verification failed — check AdminPanel.jsx manually"
  echo ""
  echo "Restore from backup:"
  echo "  cp \"$F_ADMIN.bak3-p4\" \"$F_ADMIN\""
  exit 1
fi

echo ""
