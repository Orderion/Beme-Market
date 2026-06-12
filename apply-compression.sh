#!/usr/bin/env bash
# Adds gzip compression to app.js
# Run from project root: bash apply-compression.sh

set -e

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done

F="$ROOT/Beme-Backend/src/app.js"

if [[ ! -f "$F" ]]; then
  echo "ERROR: $F not found"
  exit 1
fi

TMPJS="${TMPDIR:-/tmp}/beme_compression_$$.js"

cat > "$TMPJS" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

// Check already patched
if (content.includes("import compression from")) {
  process.stdout.write('ALREADY_PATCHED');
  process.exit(0);
}

// Add import after the last existing import line
const OLD = "import rateLimit from \"express-rate-limit\";";
const NEW = `import rateLimit from "express-rate-limit";
import compression from "compression";`;

if (!content.includes(OLD)) {
  process.stderr.write('IMPORT_LINE_NOT_FOUND');
  process.exit(1);
}

content = content.replace(OLD, NEW);

// Add app.use(compression()) right after app.set("trust proxy", 1)
const OLD2 = 'app.set("trust proxy", 1);';
const NEW2 = `app.set("trust proxy", 1);

// Gzip compress all responses — reduces payload size by ~85% on JSON
app.use(compression());`;

if (!content.includes(OLD2)) {
  process.stderr.write('TRUST_PROXY_LINE_NOT_FOUND');
  process.exit(1);
}

content = content.replace(OLD2, NEW2);
fs.writeFileSync(filePath, content, 'utf8');
process.stdout.write('OK');
ENDJS

cp "$F" "$F.bak-compression"
RESULT=$(node "$TMPJS" "$F" 2>&1)
EXIT=$?
rm -f "$TMPJS"

if [[ "$RESULT" == "ALREADY_PATCHED" ]]; then
  echo "→ Already patched — skipping"
elif [[ $EXIT -eq 0 && "$RESULT" == "OK" ]]; then
  echo "✓ Compression added to app.js"
  echo ""
  echo "Now push:"
  echo "  git add -A && git commit -m \"Add gzip compression\" && git push"
else
  echo "✗ Failed: $RESULT"
  cp "$F.bak-compression" "$F"
  exit 1
fi
