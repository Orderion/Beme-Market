const fs = require('fs');
const fp = process.argv[2];
let s = fs.readFileSync(fp, 'utf8');
const usesCRLF = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const lines = s.split('\n');
const startIdx = lines.findIndex(l => l.trim().startsWith('let setupTOTP'));
if (startIdx === -1) { console.error('NOT FOUND'); process.exit(1); }
let endIdx = startIdx;
while (endIdx < startIdx + 10) {
  const l = (lines[endIdx]||'').trim();
  if (l.startsWith('let setupTOTP')||l.startsWith('let enableTOTP')||l.startsWith('let disableTOTP')||l.startsWith('let useAISettings')||l.startsWith('try { const m = await import')) { endIdx++; } else { break; }
}
lines.splice(startIdx, endIdx - startIdx, 'import { setupTOTP, enableTOTP, disableTOTP } from "../../services/twoFactorService";', 'import { useAISettings } from "../../hooks/useAISettings";');
let r = lines.join('\n');
if (usesCRLF) r = r.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, r, 'utf8');
console.log('Done. Fixed lines', startIdx+1, 'to', endIdx);
