const fs = require('fs');
const fp = process.argv[2];
let s = fs.readFileSync(fp, 'utf8').replace(/\r\n/g, '\n');
s = s.replace(/\ntry \{ const m = await import\("\.\.\/\.\.\/services\/twoFactorService"\)[^\n]+/g, '');
s = s.replace(/\ntry \{ const m = await import\("\.\.\/\.\.\/hooks\/useAISettings"\)[^\n]+/g, '');
fs.writeFileSync(fp, s.replace(/\n/g, '\r\n'), 'utf8');
console.log('done');
