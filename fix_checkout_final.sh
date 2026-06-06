#!/bin/bash
# fix_checkout_final.sh — removes the extra }; in buildDeliveryPayload
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Frontend/src/pages/Checkout.jsx"
cp "$FILE" "${FILE}.bak3"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');

// The exact bug: after buildDeliveryPayload closes with };
// there is one extra }; that closes the Checkout function body prematurely.
// This makes everything after it (buildOrderPayload, placeCOD, etc.) 
// become module-level code, and the return() becomes a top-level return.

// Fix: remove the extra }; that appears right after buildDeliveryPayload
const bad  = '    };\n  };\n\n  };\n\n  const buildOrderPayload';
const good = '    };\n  };\n\n  const buildOrderPayload';

if (src.includes(bad)) {
  src = src.replace(bad, good);
  console.log('✅ Fixed: removed extra }; after buildDeliveryPayload');
} else {
  // Try the pattern from the uploaded document exactly
  // The document shows:    };   then   };   with no blank line between  
  const bad2 = '    };\n  };\n  };\n\n  const buildOrderPayload';
  const good2 = '    };\n  };\n\n  const buildOrderPayload';
  if (src.includes(bad2)) {
    src = src.replace(bad2, good2);
    console.log('✅ Fixed pattern 2');
  } else {
    // Brute force: find all occurrences of double }; near buildOrderPayload
    const idx = src.indexOf('const buildOrderPayload');
    if (idx > -1) {
      // Get 200 chars before buildOrderPayload
      const before = src.slice(idx - 200, idx);
      const fixed = before.replace(/\};\s*\n\s*\};\s*\n\s*$/, '};\n\n');
      if (fixed !== before) {
        src = src.slice(0, idx - 200) + fixed + src.slice(idx);
        console.log('✅ Fixed via brute force search before buildOrderPayload');
      } else {
        console.log('⚠️  Pattern not found — printing context for debugging:');
        console.log(JSON.stringify(before.slice(-100)));
      }
    }
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('Saved. Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== Verify: context around buildOrderPayload ==="
grep -n "buildOrderPayload\|buildDeliveryPayload" "$FILE" | head -6

echo ""
echo "=== Verify: no top-level return ==="
node -e "
const src = require('fs').readFileSync('$FILE','utf8');
const lines = src.split('\n');
let depth = 0;
let issues = [];
lines.forEach((line, i) => {
  const opens = (line.match(/\{/g)||[]).length;
  const closes = (line.match(/\}/g)||[]).length;
  depth += opens - closes;
  if (line.trim().startsWith('return') && depth <= 1) {
    issues.push('Line ' + (i+1) + ' depth=' + depth + ': ' + line.trim().slice(0,60));
  }
});
if (issues.length === 0) console.log('✅ No top-level returns found');
else issues.forEach(x => console.log('⚠️  ' + x));
" 2>/dev/null || echo "Node check skipped"
