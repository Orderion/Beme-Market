#!/usr/bin/env bash
# ============================================================
# ONBOARDING FIX — StoreOnboarding.jsx error visibility
#   The catch block on handleContinue() swallowed the real error
#   completely — `catch { alert("Failed to save...") }` never logs
#   what actually went wrong. This is why the step1/step2/step3/step4
#   Firestore rules mismatch was invisible until traced by hand.
#   Now logs the real error to console so future failures are
#   diagnosable instead of a dead-end generic alert.
# CRLF-tolerant. Run from project root: bash apply-storeonboarding-error-log.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}ONBOARDING FIX — StoreOnboarding.jsx error logging${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/StoreOnboarding.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}StoreOnboarding.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_sofix.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('[StoreOnboarding] save failed')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const OLD = `      await saveApplicationStep(user.uid, 1, stepData);
      navigate("/store-survey");
    } catch {
      alert("Failed to save. Please try again.");
    } finally {`;

const NEW = `      await saveApplicationStep(user.uid, 1, stepData);
      navigate("/store-survey");
    } catch (err) {
      console.error("[StoreOnboarding] save failed:", err?.code || err?.message || err);
      alert(err?.message ? \`Failed to save: \${err.message}\` : "Failed to save. Please try again.");
    } finally {`;

if (!s.includes(OLD)) { console.error('NOT_FOUND: handleContinue catch block — exact text did not match'); process.exit(1); }
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-sofix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Error logging added (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "StoreOnboarding] save failed" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-sofix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
