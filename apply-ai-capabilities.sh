#!/usr/bin/env bash
# ============================================================
# BEME — Patch: AI Capabilities tab (DashboardSettings.jsx)
#   - tier-gate (dimmed + locked on Basic/free)
#   - captions under each toggle
#   - 3 backend-dependent toggles marked "Coming soon" (disabled)
#   - robot icon instead of sparkle
# CRLF-tolerant. Run from project root: bash apply-ai-capabilities.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — AI Capabilities (tier-gate + captions)${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do ROOT="$(dirname "$ROOT")"; done
[[ ! -f "$ROOT/package.json" ]] && { echo -e "${RED}root not found${NC}"; exit 1; }
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardSettings.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}DashboardSettings.jsx not found${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_aicap.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('RobotMini') && s.includes('hasAI')) { console.log('ALREADY_PATCHED'); process.exit(0); }

// Anchor: the entire AUTOS const + AICapabilitiesTab function (single dense block).
// We match from "const AUTOS=[" up to the end of the AICapabilitiesTab function.
const startMarker = 'const AUTOS=[';
const endMarker   = 'These toggles control background automations only.</div></div></div>);}';
const startIdx = s.indexOf(startMarker);
const endIdx   = s.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) { console.error('NOT_FOUND: AICapabilitiesTab block'); process.exit(1); }
const before = s.slice(0, startIdx);
const after  = s.slice(endIdx + endMarker.length);

const REPLACEMENT = `// ── AI CAPABILITIES TAB ──
// ready:true  → feature exists today and reads this flag.
// ready:false → background automation not yet built; shown as "Coming soon" (disabled).
const AUTOS = [
  { key:"aiProductDescriptions", ready:true,  label:"Product Descriptions",  desc:"Lets Beme AI generate product copy from a short prompt on the product page." },
  { key:"aiSeoOptimization",     ready:true,  label:"SEO Optimization",      desc:"Allows AI to suggest improved, search-friendly product titles." },
  { key:"aiMarketingAssistant",  ready:true,  label:"Marketing Assistant",   desc:"Generates Instagram, TikTok and WhatsApp captions for your products." },
  { key:"aiAnalyticsExplainer",  ready:true,  label:"Analytics Explainer",   desc:"Explains your store metrics in plain English when you ask in Beme AI." },
  { key:"aiSalesSuggestions",    ready:true,  label:"Sales Suggestions",     desc:"Surfaces AI tips to help lift your conversion rate." },
  { key:"aiCustomerReplies",     ready:false, label:"Customer Auto-Replies", desc:"Automatically answers common buyer questions in your inbox." },
  { key:"aiFollowUpSuggestions", ready:false, label:"Follow-Up Suggestions", desc:"Re-engages past buyers with AI-written follow-up prompts." },
  { key:"aiStoreHealthAnalysis", ready:false, label:"Store Health Analysis", desc:"Sends a weekly AI diagnosis of your store performance." },
];

// Small robot, matches the Beme AI logo. Monochrome via currentColor.
function RobotMini({ size = 16, color = "var(--sd-accent)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ color, flexShrink:0 }}>
      <line x1="50" y1="14" x2="50" y2="26" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="50" cy="9" r="6" fill="currentColor"/>
      <path d="M22 40 Q22 28 34 27 L66 27 Q78 28 78 40 L78 40 Q86 41 86 52 Q86 63 78 64 L78 64 Q78 76 66 77 L34 77 Q22 76 22 64 L22 64 Q14 63 14 52 Q14 41 22 40 Z" fill="currentColor"/>
      <rect x="29" y="38" width="42" height="30" rx="13" fill="var(--sd-white)"/>
      <ellipse cx="42" cy="53" rx="4.5" ry="5.5" fill="currentColor"/>
      <ellipse cx="58" cy="53" rx="4.5" ry="5.5" fill="currentColor"/>
      <path d="M45 61 Q50 64 55 61" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function AICapabilitiesTab() {
  const { settings, loading, saving, updateSetting } = useAISettings();
  const { planLimits, subscriptionPlan } = useSellerAuth();
  const hasAI = !!planLimits?.hasAI;

  return (
    <div style={{ maxWidth:560 }}>
      <h2 className="ds-content-title">AI Capabilities</h2>
      <p className="ds-content-sub">Control which AI features are active across your store.</p>

      {!hasAI && (
        <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"14px 16px",borderRadius:12,background:"var(--sd-accent-dim)",border:"1px solid var(--sd-accent-border)",marginBottom:16 }}>
          <Ico d={IC.lock} size={16} color="var(--sd-accent)"/>
          <div style={{ fontSize:12.5,color:"var(--sd-text)",lineHeight:1.6 }}>
            AI features are available on <strong>Starter, Growth and Pro</strong> plans. Upgrade your plan to turn these on.
          </div>
        </div>
      )}

      <div className="sd-panel" style={{ marginBottom:16, position:"relative" }}>
        <div style={{ fontSize:12,fontWeight:700,color:"var(--sd-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4 }}>Automation Toggles</div>
        <div style={{ fontSize:12,color:"var(--sd-muted)",marginBottom:16 }}>Changes take effect within a few minutes.</div>

        <div style={{ opacity: hasAI ? 1 : 0.5, pointerEvents: hasAI ? "auto" : "none", transition:"opacity 0.2s" }}>
          {loading ? (
            <div style={{ fontSize:13,color:"var(--sd-muted)",padding:"8px 0" }}>Loading settings…</div>
          ) : AUTOS.map((a, idx) => {
            const disabled = !hasAI || saving || !a.ready;
            return (
              <div key={a.key} style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,padding:"13px 0",borderBottom:idx<AUTOS.length-1?"1px solid var(--sd-border-light)":"none",opacity:a.ready?1:0.65 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"var(--sd-text)" }}>{a.label}</span>
                    {!a.ready && (
                      <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.04em",padding:"2px 7px",borderRadius:100,background:"var(--sd-bg)",border:"1px solid var(--sd-border)",color:"var(--sd-muted)",textTransform:"uppercase" }}>Coming soon</span>
                    )}
                  </div>
                  <div style={{ fontSize:12,color:"var(--sd-muted)",lineHeight:1.5 }}>{a.desc}</div>
                </div>
                <Toggle on={a.ready ? !!settings[a.key] : false} onChange={v=>updateSetting(a.key,v)} disabled={disabled}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:"14px 16px",borderRadius:12,background:"var(--sd-accent-dim)",border:"1px solid var(--sd-accent-border)",display:"flex",alignItems:"flex-start",gap:10 }}>
        <RobotMini size={18} color="var(--sd-accent)"/>
        <div style={{ fontSize:12,color:"var(--sd-text)",lineHeight:1.6 }}>To chat directly with Beme AI, visit the <strong>Beme AI</strong> tab in the sidebar. These toggles control background automations only.</div>
      </div>
    </div>
  );
}`;

s = before + REPLACEMENT + after;

// Ensure useSellerAuth is imported (it already is in this file, but guard anyway).
if (!s.includes('import { useSellerAuth }')) {
  s = s.replace(
    'import { useAuth } from "../../context/AuthContext";',
    'import { useAuth } from "../../context/AuthContext";\nimport { useSellerAuth } from "../../hooks/useSellerAuth";'
  );
}

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-aicap"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then echo -e "  ${YELLOW}→${NC} Already patched"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then echo -e "  ${GREEN}✓${NC} AI Capabilities upgraded (${OUT#OK_} endings)"
else echo -e "  ${RED}✗${NC} Failed: $OUT"; cp "$F.bak-aicap" "$F"; echo -e "  ${YELLOW}restored${NC}"; fi
echo ""
