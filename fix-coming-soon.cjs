const fs = require('fs');
const fp = process.argv[2];
let s = fs.readFileSync(fp, 'utf8');
const usesCRLF = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const before = s;
s = s.replace(/key:"aiProductDescriptions", ready:true/, 'key:"aiProductDescriptions", ready:false');
s = s.replace(/key:"aiSeoOptimization",\s*ready:true/, 'key:"aiSeoOptimization",     ready:false');
s = s.replace(/key:"aiMarketingAssistant",\s*ready:true/, 'key:"aiMarketingAssistant",  ready:false');
s = s.replace(/key:"aiAnalyticsExplainer",\s*ready:true/, 'key:"aiAnalyticsExplainer",  ready:false');
s = s.replace(/key:"aiSalesSuggestions",\s*ready:true/, 'key:"aiSalesSuggestions",    ready:false');
if (s === before) { console.error('NO CHANGES MADE - pattern mismatch'); process.exit(1); }
if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log('done');
