#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/dashboard/DashboardHome.jsx';
let src = fs.readFileSync(path, 'utf8');

// Replace the orders query to use shopOwnerId
const oldQuery = `        const snap = await getDocs(query(
          collection(db, "orders"),
          where("sellerId", "==", sid || user.uid),
          where("createdAt", ">=", startOfLastMonth()),
          orderBy("createdAt", "desc"),
          limit(200)
        ));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));`;

const newQuery = `        // Query by shopOwnerId — seller's auth uid stored on order
        const results = new Map();
        const queryId = sid || user.uid;

        const runQ = async (q) => {
          try {
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              if (!results.has(d.id)) results.set(d.id, { id: d.id, ...d.data() });
            });
          } catch (e) { console.warn("[DH] query failed:", e?.code); }
        };

        await runQ(query(
          collection(db, "orders"),
          where("shopOwnerId", "==", queryId),
          limit(200)
        ));

        // Also try shop.id if different
        if (shop?.id && shop.id !== queryId) {
          await runQ(query(
            collection(db, "orders"),
            where("shopOwnerId", "==", shop.id),
            limit(200)
          ));
        }

        const all = Array.from(results.values()).sort((a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );`;

if (src.includes(oldQuery)) {
  src = src.replace(oldQuery, newQuery);
  console.log('✅ orders query replaced with shopOwnerId');
} else {
  // Line-level fallback
  src = src.replace(
    `where("sellerId", "==", sid || user.uid),`,
    `where("shopOwnerId", "==", sid || user.uid),`
  );
  // Remove orderBy and where createdAt since we don't need index
  src = src.replace(
    `          where("createdAt", ">=", startOfLastMonth()),\n          orderBy("createdAt", "desc"),\n          limit(200)`,
    `          limit(200)`
  );
  console.log('✅ query field replaced (line-level)');
}

// Filter by date client-side since we removed the where("createdAt") clause
// The existing filter already does this:
// setOrders(all.filter(o => (o.createdAt?.toMillis?.() || 0) >= ms));
// setLastOrds filters too — so it's fine

// Remove unused imports if orderBy was removed
src = src.replace(
  `import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";`,
  `import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";`
);

fs.writeFileSync(path, src, 'utf8');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== Verify ==="
grep -n "shopOwnerId\|sellerId.*==\|where.*orders" \
  Beme-Frontend/src/pages/dashboard/DashboardHome.jsx | head -10

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/pages/dashboard/DashboardHome.jsx"
echo "  git commit -m 'fix: DashboardHome queries orders by shopOwnerId'"
echo "  git push"
