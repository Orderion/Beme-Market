#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");

// ── 1. Fix Orders.jsx — show code name and type in discount row ──
let orders = fs.readFileSync("Beme-Frontend/src/pages/Orders.jsx","utf8").replace(/\r\n/g,"\n");

// Add discountCode field extraction alongside discount
orders = orders.replace(
  `const discount = order.pricing?.discount ?? order.amounts?.discount ?? 0;`,
  `const discount     = order.pricing?.discount ?? order.amounts?.discount ?? 0;
              const discountCode = order.pricing?.discountCode ?? order.amounts?.discountCode ?? null;`
);

// Replace the discount row to show code and type
orders = orders.replace(
  `{discount > 0 && <div className="ord-summary-row ord-summary-row--discount"><span>Discount</span><span>-{fmtMoney(discount)}</span></div>}`,
  `{discount > 0 && (
                        <div className="ord-summary-row ord-summary-row--discount">
                          <span>Discount{discountCode ? <small style={{marginLeft:5,opacity:0.75}}>{discountCode}</small> : ""}</span>
                          <span>-{fmtMoney(discount)}</span>
                        </div>
                      )}`
);

fs.writeFileSync("Beme-Frontend/src/pages/Orders.jsx", orders.replace(/\n/g,"\r\n"),"utf8");
console.log("✅ Orders.jsx — discount row shows code name");

// ── 2. Fix DashboardOrders.jsx — show code name ──
let dash = fs.readFileSync("Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx","utf8").replace(/\r\n/g,"\n");

dash = dash.replace(
  `{price.discount > 0 && <div className="do-total-row do-total-row--discount"><span>Discount</span><span>-{fmtMoney(price.discount)}</span></div>}`,
  `{price.discount > 0 && (
              <div className="do-total-row do-total-row--discount">
                <span>Discount{price.discountCode ? <span style={{marginLeft:5,fontSize:10,opacity:0.75,fontFamily:"monospace"}}>{price.discountCode}</span> : ""}</span>
                <span>-{fmtMoney(price.discount)}</span>
              </div>
            )}`
);

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx", dash.replace(/\n/g,"\r\n"),"utf8");
console.log("✅ DashboardOrders.jsx — discount row shows code name");

// ── 3. Move increment to BACKEND — fix Firestore rules issue ──
// The customer's Firestore rules likely block writes to discountCodes
// Move the increment to the backend orderRoutes.js after order creation
let orderRoutes = fs.readFileSync("Beme-Backend/src/routes/orderRoutes.js","utf8").replace(/\r\n/g,"\n");

// Check if adminDb is available (it should be)
const hasAdminDb = orderRoutes.includes("adminDb");
console.log("adminDb available:", hasAdminDb);

// Add increment after order is created in COD route
const COD_AFTER = `    const orderRef = await adminDb.collection("orders").add(payload);
    const created = await orderRef.get();
    return res.status(201).json({`;

const COD_NEW = `    const orderRef = await adminDb.collection("orders").add(payload);
    const created = await orderRef.get();

    // Increment discount code usage if one was applied
    const discountCodeId = pricing?.discountCodeId;
    if (discountCodeId && pricing?.discount > 0) {
      adminDb.collection("discountCodes").doc(discountCodeId).update({
        usedCount: (await adminDb.collection("discountCodes").doc(discountCodeId).get()).data()?.usedCount + 1 || 1,
      }).catch(e => console.error("[discount increment]", e));
    }

    return res.status(201).json({`;

if (orderRoutes.includes(COD_AFTER)) {
  orderRoutes = orderRoutes.replace(COD_AFTER, COD_NEW);
  console.log("✅ Backend COD increment added");
} else {
  console.log("❌ COD_AFTER pattern not found");
}

fs.writeFileSync("Beme-Backend/src/routes/orderRoutes.js", orderRoutes.replace(/\n/g,"\r\n"),"utf8");

// Syntax check
const { execSync } = require("child_process");
try {
  execSync('node --check "Beme-Backend/src/routes/orderRoutes.js"');
  console.log("✅ orderRoutes.js syntax OK");
} catch(e) {
  console.error("❌ Syntax error:", e.message);
}
NODEEOF
