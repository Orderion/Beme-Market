const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'Beme-Frontend', 'dist', 'assets');
const f = fs.readdirSync(dir).find(x => x.startsWith('index-') && x.endsWith('.js'));
console.log('File:', f);
const s = fs.readFileSync(path.join(dir, f), 'utf8');
const i = s.indexOf('}a;function ');
if (i === -1) { console.log('Pattern NOT FOUND - bug may be fixed!'); process.exit(0); }
console.log(s.slice(Math.max(0, i-500), i+150));
