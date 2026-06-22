#!/usr/bin/env bash
# ============================================================
# ONBOARDING FIX — firestore.rules: storeApplications step keys
#
#   ROOT CAUSE: saveApplicationStep(uid, step, data) in storeService.js
#   writes a field literally named "step1", "step2", "step3", or "step4"
#   (the step NUMBER is part of the key name). But
#   validStoreApplicationUserFields() only allowed a key named "step"
#   (no number) — meaning every single onboarding step save was
#   rejected by Firestore security rules, every time, for every user.
#   This is why sellers get stuck on "Failed to save. Please try again."
#   and never progress past step 1, leaving them permanently in a
#   draft application that later gets misread as "already has a store."
#
#   FIX: allow step1, step2, step3, step4 (matching "Step 1 of 4" in the
#   onboarding UI) instead of the non-existent "step" key.
#
# CRLF-tolerant. Run from project root: bash apply-firestore-onboarding-steps-fix.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}ONBOARDING FIX — firestore.rules step1-4 key mismatch${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/firestore.rules" ]]; do ROOT="$(dirname "$ROOT")"; done
if [[ ! -f "$ROOT/firestore.rules" ]]; then
  ROOT="$PWD"
  while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
fi
F="$ROOT/firestore.rules"
[[ ! -f "$F" ]] && { echo -e "${RED}firestore.rules not found. Searched from: $PWD${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_onboardingsteps.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('"step1","step2","step3","step4"')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const OLD = `    function validStoreApplicationUserFields() {
      return request.resource.data.keys().hasOnly([
        "storeName","storeSlug","storeDescription","storeCategory",
        "storeLocation","storePhone","storeEmail","storeLogo","storeBanner",
        "businessType","businessRegNumber","contactName","contactPhone",
        "socialLinks","surveyAnswers","createdAt","updatedAt","userId",
        "step","onboardingComplete","currency","country"
      ]);
    }`;

const NEW = `    function validStoreApplicationUserFields() {
      // ONBOARDING FIX: saveApplicationStep() writes a field named
      // "step1"/"step2"/"step3"/"step4" (the step NUMBER is part of the
      // key), not a field literally named "step" — that mismatch caused
      // every onboarding step save to be rejected by these rules.
      return request.resource.data.keys().hasOnly([
        "storeName","storeSlug","storeDescription","storeCategory",
        "storeLocation","storePhone","storeEmail","storeLogo","storeBanner",
        "businessType","businessRegNumber","contactName","contactPhone",
        "socialLinks","surveyAnswers","createdAt","updatedAt","userId",
        "step1","step2","step3","step4","onboardingComplete","currency","country"
      ]);
    }`;

if (!s.includes(OLD)) { console.error('NOT_FOUND: validStoreApplicationUserFields() — exact text did not match'); process.exit(1); }
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-onboardingsteps"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} storeApplications now accepts step1-step4 (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n '"step1","step2","step3","step4"' "$F" | sed 's/^/    /'
  echo ""
  echo -e "  ${YELLOW}IMPORTANT: this only edits the local file. You still need to deploy it:${NC}"
  echo "    firebase deploy --only firestore:rules"
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-onboardingsteps" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
