// patch_dashboard_theme.js
// Fixes seller dashboard dark mode — dashboard uses its own stored preference,
// not the global site theme. If seller has dark mode ON in dashboard, it stays dark.
// If OFF, it stays light regardless of the site-level theme.
// Run from: C:\Users\user\Documents\Beme Project
// Usage: node patch_dashboard_theme.js

const fs   = require("fs");
const path = require("path");

const filePath = path.join("Beme-Frontend","src","pages","SellerDashboard.jsx");
let src = fs.readFileSync(filePath, "utf8");

// ── 1. Add local dark state using localStorage key 'beme_dash_dark' ──
// Replace the isDark line so the dashboard uses its OWN preference, not global theme
src = src.replace(
  `  const isDark   = theme === "dark";`,
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
  };`
);

// ── 2. Replace toggleTheme with toggleDashTheme in the sidebar footer button ──
src = src.replace(
  `          onClick={() => setSidebarOpen(o => !o)}`,
  `          onClick={() => setSidebarOpen(o => !o)}`
);

// Replace the theme toggle button to use local toggle
src = src.replace(
  `          <button className="sd-footer-btn" onClick={toggleTheme}
            title={\`Switch to \${isDark ? "light" : "dark"} mode\`}>`,
  `          <button className="sd-footer-btn" onClick={toggleDashTheme}
            title={\`Switch to \${isDark ? "light" : "dark"} mode\`}>`
);

fs.writeFileSync(filePath, src, "utf8");
console.log("✅ SellerDashboard.jsx patched — dashboard uses own dark mode preference");

const checks = ["beme_dash_dark","dashDark","toggleDashTheme","isDark = dashDark"];
checks.forEach(k => console.log("  " + (src.includes(k) ? "✅" : "❌") + " " + k));
