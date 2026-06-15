#!/usr/bin/env bash
# ============================================================
# BEME MARKET — BUILD 5 PATCH SCRIPT (v2 - robust)
# Patch 1: Orders pagination (no Firestore index needed)
# Patch 2: AuthContext Firestore retry
# Run from project root: bash apply-build5-patches-v2.sh
# ============================================================
# NOTE: no `set -e` — we want failures to report, not kill the run.

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; SKIP=0

echo ""
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Beme Market — Build 5 Patch (v2)        ${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""

# Find project root
ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done
if [[ ! -f "$ROOT/package.json" ]]; then
  echo -e "${RED}ERROR: project root not found.${NC}"; exit 1
fi
echo -e "Project root: ${CYAN}$ROOT${NC}"

# Verify node exists
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}ERROR: node not found on PATH.${NC}"; exit 1
fi
echo -e "Node: ${CYAN}$(node --version)${NC}"
echo ""

F_ORDER="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
F_AUTH="$ROOT/Beme-Frontend/src/context/AuthContext.jsx"

for f in "$F_ORDER" "$F_AUTH"; do
  if [[ -f "$f" ]]; then echo -e "  ${GREEN}✓${NC} found ${f#$ROOT/}"
  else echo -e "  ${RED}✗${NC} MISSING ${f#$ROOT/}"; exit 1; fi
done
echo ""

# Use a helper file in the project root (avoids temp-path issues on Git Bash)
HELPER="$ROOT/.beme_patch_helper.cjs"

# ─────────────────────────────────────────────────────────────
# PATCH 1 — Orders pagination
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}Patch 1/2 — orderRoutes.js: orders pagination${NC}"

cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('const pageLimit = Math.min(')) {
  console.log('ALREADY_PATCHED'); process.exit(0);
}

// Anchor on just the unique snap line — more robust than matching the whole block.
const ANCHOR = '    const snap = await adminDb.collection("orders").where("userId", "==", authUser.uid).get();\n    const orders = snap.docs\n      .map(sanitizeOrderForResponse)\n      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));\n    return res.json({ success: true, orders });';

const REPLACEMENT = `    // Pagination: ?limit= (default 50, capped 100) and ?offset= for paging.
    // Sorted in-memory by createdAt desc so no composite Firestore index is needed.
    const pageLimit = Math.min(100, Math.max(1, parseInt(req.query && req.query.limit, 10) || 50));
    const offset    = Math.max(0, parseInt(req.query && req.query.offset, 10) || 0);

    const snap = await adminDb.collection("orders").where("userId", "==", authUser.uid).get();

    const allOrders = snap.docs
      .map(sanitizeOrderForResponse)
      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));

    const total   = allOrders.length;
    const orders  = allOrders.slice(offset, offset + pageLimit);
    const hasMore = offset + pageLimit < total;

    return res.json({
      success: true,
      orders,
      total,
      limit: pageLimit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + pageLimit : null,
    });`;

if (content.indexOf(ANCHOR) === -1) {
  console.error('NOT_FOUND: anchor block not located');
  process.exit(1);
}
content = content.replace(ANCHOR, REPLACEMENT);
fs.writeFileSync(filePath, content, 'utf8');
console.log('OK');
ENDJS

cp "$F_ORDER" "$F_ORDER.bak5b"
OUT=$(node "$HELPER" "$F_ORDER" 2>&1)
CODE=$?
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched"; SKIP=$((SKIP+1))
elif [[ $CODE -eq 0 && "$OUT" == "OK" ]]; then
  echo -e "  ${GREEN}✓${NC} Applied — orders capped at 50/request (max 100)"; PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${NC} Failed (exit $CODE): $OUT"; FAIL=$((FAIL+1))
  cp "$F_ORDER.bak5b" "$F_ORDER"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# PATCH 2 — AuthContext retry
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}Patch 2/2 — AuthContext.jsx: Firestore retry${NC}"

cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('async function getDocWithRetry')) {
  console.log('ALREADY_PATCHED'); process.exit(0);
}

const ANCHOR = 'async function resolveProfile(uid) {\n  const snap = await getDoc(doc(db, "users", uid));';

const REPLACEMENT = `// Retry helper: if the Firestore read fails (brief outage during login),
// wait 1s and try once more before falling back to the customer default.
async function getDocWithRetry(ref, retries = 1, delayMs = 1000) {
  try {
    return await getDoc(ref);
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return getDocWithRetry(ref, retries - 1, delayMs);
    }
    throw err;
  }
}

async function resolveProfile(uid) {
  const snap = await getDocWithRetry(doc(db, "users", uid));`;

if (content.indexOf(ANCHOR) === -1) {
  console.error('NOT_FOUND: resolveProfile anchor not located');
  process.exit(1);
}
content = content.replace(ANCHOR, REPLACEMENT);
fs.writeFileSync(filePath, content, 'utf8');
console.log('OK');
ENDJS

cp "$F_AUTH" "$F_AUTH.bak5b"
OUT=$(node "$HELPER" "$F_AUTH" 2>&1)
CODE=$?
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched"; SKIP=$((SKIP+1))
elif [[ $CODE -eq 0 && "$OUT" == "OK" ]]; then
  echo -e "  ${GREEN}✓${NC} Applied — single retry with 1s delay"; PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${NC} Failed (exit $CODE): $OUT"; FAIL=$((FAIL+1))
  cp "$F_AUTH.bak5b" "$F_AUTH"
fi
echo ""

# Cleanup helper
rm -f "$HELPER"

echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "  ${GREEN}✓${NC} Passed: $PASS   ${YELLOW}→${NC} Skipped: $SKIP   ${RED}✗${NC} Failed: $FAIL"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}Done.${NC} Push everything:"
  echo ""
  echo -e "  ${CYAN}git add -A && git commit -m \"Build 5: orders pagination + AuthContext Firestore retry\" && git push${NC}"
else
  echo -e "${YELLOW}$FAIL failed — file(s) restored from .bak5b backup. Paste the error above.${NC}"
fi
echo ""
