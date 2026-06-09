// fix_storefront_banner.js
// ONLY reduces the banner height in StoreFront.jsx — nothing else changes
// Old: height: 240 (inline style, stretches and loses quality)
// New: height: 220px max with object-position to keep focus
// Run from: C:\Users\user\Documents\Beme Project

const fs = require("fs");
const path = "Beme-Frontend/src/pages/StoreFront.jsx";
let src = fs.readFileSync(path, "utf8");

// ── Fix 1: Reduce the banner div height (inline style version — old file) ──
src = src.replace(
  `<div style={{ position: "relative", height: 240,
        background: shop.bannerUrl ? "transparent" : "linear-gradient(135deg,#046EF2 0%,#1e3a8a 100%)" }}>`,
  `<div style={{ position: "relative", height: 200,
        background: shop.bannerUrl ? "transparent" : "linear-gradient(135deg,#046EF2 0%,#1e3a8a 100%)" }}>`
);

// ── Fix 2: Add object-position to the banner image so it doesn't just stretch ──
src = src.replace(
  `<img src={shop.bannerUrl} alt="banner"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />`,
  `<img src={shop.bannerUrl} alt="banner"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }} />`
);

// ── Fix 3: Also fix loading skeleton banner height ──
src = src.replace(
  `<div style={{ height: 260, background: "rgba(0,0,0,0.06)", borderRadius: "0 0 20px 20px", marginBottom: 0 }} />`,
  `<div style={{ height: 200, background: "rgba(0,0,0,0.06)", borderRadius: "0 0 20px 20px", marginBottom: 0 }} />`
);

fs.writeFileSync(path, src, "utf8");
console.log("✅ StoreFront.jsx — banner height reduced to 200px");

const checks = [
  ["height: 200",            src.includes("height: 200")],
  ["objectPosition",         src.includes("objectPosition")],
  ["no height: 240",        !src.includes("height: 240")],
  ["no height: 260",        !src.includes("height: 260")],
];
checks.forEach(([label, ok]) => console.log("  " + (ok ? "✅" : "❌") + " " + label));
