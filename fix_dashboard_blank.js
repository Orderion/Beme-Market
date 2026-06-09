// fix_dashboard_blank.js
// Reverts the broken dashDark patch that caused the blank page
// and applies a clean minimal fix instead
// Run from: C:\Users\user\Documents\Beme Project

const fs = require("fs");
const path = "Beme-Frontend/src/pages/SellerDashboard.jsx";
let src = fs.readFileSync(path, "utf8");

// ── Remove the broken dashDark block if it exists ──
src = src.replace(
  `  // Dashboard has its OWN dark mode preference stored in localStorage
  // This is independent of the site's global dark mode
  const [dashDark, setDashDark] = useState(() => {
    try { return localStorage.getItem("beme_dash_dark") === "true"; }
    catch { return false; }
  });
  const isDark = dashDark;

  const toggleDashTheme = () => {
    setDashDark(d => {
      const next = !d;
      try { localStorage.setItem("beme_dash_dark", String(next)); } catch {}
      return next;
    });
  };`,
  `  const isDark = theme === "dark";`
);

// ── Restore toggleTheme in the button (in case it was changed) ──
src = src.replace(
  `          <button className="sd-footer-btn" onClick={toggleDashTheme}`,
  `          <button className="sd-footer-btn" onClick={toggleTheme}`
);

fs.writeFileSync(path, src, "utf8");
console.log("✅ SellerDashboard.jsx — blank page fix applied");

// Verify it compiled cleanly
const hasIsDark    = src.includes("const isDark = theme");
const hasBroken    = src.includes("dashDark");
const hasToggle    = src.includes("onClick={toggleTheme}");
console.log("  " + (hasIsDark  ? "✅" : "❌") + " isDark = theme");
console.log("  " + (!hasBroken ? "✅" : "❌") + " no broken dashDark");
console.log("  " + (hasToggle  ? "✅" : "❌") + " toggleTheme restored");
