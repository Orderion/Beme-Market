#!/usr/bin/env bash
# ============================================================
# BEME — Patch: robot icon in sidebar nav (SellerDashboard.jsx)
# CRLF-tolerant. Run from project root: bash apply-robot-nav.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — sidebar robot icon${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do ROOT="$(dirname "$ROOT")"; done
[[ ! -f "$ROOT/package.json" ]] && { echo -e "${RED}root not found${NC}"; exit 1; }
F="$ROOT/Beme-Frontend/src/pages/SellerDashboard.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}SellerDashboard.jsx not found${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_robotnav.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('function RobotNavIcon')) { console.log('ALREADY_PATCHED'); process.exit(0); }

// 1. Insert RobotNavIcon component right after the Ico() helper closes.
const ICO_ANCHOR = `function Ico({ d, size = 18, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}`;
const ROBOT_COMP = ICO_ANCHOR + `

// Robot logo for the Beme AI nav item — monochrome, follows currentColor.
function RobotNavIcon({ size = 17, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ color }}>
      <line x1="50" y1="14" x2="50" y2="26" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="50" cy="9" r="6" fill="currentColor"/>
      <path d="M22 40 Q22 28 34 27 L66 27 Q78 28 78 40 L78 40 Q86 41 86 52 Q86 63 78 64 L78 64 Q78 76 66 77 L34 77 Q22 76 22 64 L22 64 Q14 63 14 52 Q14 41 22 40 Z" fill="currentColor"/>
      <rect x="29" y="38" width="42" height="30" rx="13" fill="var(--sd-white)"/>
      <ellipse cx="42" cy="53" rx="4.5" ry="5.5" fill="currentColor"/>
      <ellipse cx="58" cy="53" rx="4.5" ry="5.5" fill="currentColor"/>
      <path d="M45 61 Q50 64 55 61" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}`;
if (!s.includes(ICO_ANCHOR)) { console.error('NOT_FOUND: Ico helper'); process.exit(1); }
s = s.replace(ICO_ANCHOR, ROBOT_COMP);

// 2. Render RobotNavIcon for the "ai" nav item. The nav icon span currently:
//      <Ico d={item.icon} size={17} color={...} />
//    Replace with a conditional that uses the robot for item.id === "ai".
const NAV_ICON_ANCHOR = `                <span className="sd-nav-icon">
                  <Ico d={item.icon} size={17} color={isActive ? "var(--sd-accent)" : "var(--sd-nav-icon)"} />
                </span>`;
const NAV_ICON_NEW = `                <span className="sd-nav-icon">
                  {item.id === "ai"
                    ? <RobotNavIcon size={18} color={isActive ? "var(--sd-accent)" : "var(--sd-nav-icon)"} />
                    : <Ico d={item.icon} size={17} color={isActive ? "var(--sd-accent)" : "var(--sd-nav-icon)"} />}
                </span>`;
if (!s.includes(NAV_ICON_ANCHOR)) { console.error('NOT_FOUND: nav icon span'); process.exit(1); }
s = s.replace(NAV_ICON_ANCHOR, NAV_ICON_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-robotnav"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then echo -e "  ${YELLOW}→${NC} Already patched"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then echo -e "  ${GREEN}✓${NC} Robot icon added to sidebar (${OUT#OK_} endings)"
else echo -e "  ${RED}✗${NC} Failed: $OUT"; cp "$F.bak-robotnav" "$F"; echo -e "  ${YELLOW}restored${NC}"; fi
echo ""
