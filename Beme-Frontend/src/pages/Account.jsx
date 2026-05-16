/* =============================================
   ACCOUNT PAGE — Beme Market
   Jumia-style layout · Blue #046EF2 · Nunito
   Desktop: sidebar + main grid
   Mobile: single column
============================================= */

/* ── Page shell ── */
.acc-page {
  min-height: 100vh;
  background: #F4F6F8;
  font-family: var(--font-main, "Nunito", system-ui, sans-serif);
  padding-bottom: 80px;
}

/* ── Inner layout ── */
.acc-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  align-items: start;
}

/* ================================================================
   LEFT SIDEBAR
================================================================ */
.acc-sidebar {
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  overflow: hidden;
  position: sticky;
  top: 80px;
}

/* User identity block */
.acc-sidebar-user {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #046EF2 0%, #0357C7 100%);
  cursor: pointer;
  transition: opacity 0.15s;
}
.acc-sidebar-user:hover { opacity: 0.92; }

.acc-sidebar-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 900;
  color: #fff;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.4);
}
.acc-sidebar-name-wrap { min-width: 0; }
.acc-sidebar-name {
  font-size: 14px; font-weight: 800;
  color: #fff; letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.acc-sidebar-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  color: rgba(255,255,255,0.8);
  margin-top: 2px;
  text-transform: uppercase; letter-spacing: 0.06em;
}

/* Nav groups */
.acc-sidebar-section {
  padding: 8px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.acc-sidebar-section:last-child { border-bottom: none; }

.acc-sidebar-label {
  padding: 6px 16px 4px;
  font-size: 10px; font-weight: 800;
  color: #9CA3AF;
  text-transform: uppercase; letter-spacing: 0.08em;
}

/* Nav link button */
.acc-nav-link {
  display: flex; align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 16px;
  background: transparent; border: none;
  cursor: pointer; text-align: left;
  font-family: var(--font-main, "Nunito", system-ui, sans-serif);
  font-size: 14px; font-weight: 600;
  color: #374151;
  transition: background 0.12s, color 0.12s;
  position: relative;
}
.acc-nav-link:hover { background: #F0F6FF; color: #046EF2; }
.acc-nav-link:hover .acc-nav-icon { color: #046EF2; }

/* Active state */
.acc-nav-link--active {
  background: #EEF4FF;
  color: #046EF2;
  font-weight: 800;
}
.acc-nav-link--active .acc-nav-icon { color: #046EF2; }
.acc-nav-link--active::before {
  content: "";
  position: absolute; left: 0; top: 4px; bottom: 4px;
  width: 3px; border-radius: 0 3px 3px 0;
  background: #046EF2;
}

/* Danger link (logout) */
.acc-nav-link--danger { color: #EF4444; }
.acc-nav-link--danger:hover { background: rgba(239,68,68,0.06); color: #EF4444; }
.acc-nav-link--danger .acc-nav-icon { color: #EF4444; }

.acc-nav-icon {
  color: #9CA3AF;
  flex-shrink: 0;
  transition: color 0.12s;
}
.acc-nav-badge {
  margin-left: auto;
  background: #046EF2; color: #fff;
  font-size: 10px; font-weight: 800;
  padding: 2px 7px; border-radius: 100px;
  min-width: 18px; text-align: center;
  line-height: 1.6;
}
.acc-nav-badge--red { background: #EF4444; }

/* ================================================================
   RIGHT MAIN CONTENT
================================================================ */
.acc-main { min-width: 0; }

.acc-main-title {
  font-size: 20px; font-weight: 900;
  color: #111; letter-spacing: -0.03em;
  margin: 0 0 18px;
}

/* ── Overview grid ── */
.acc-overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* ── Overview card ── */
.acc-overview-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.acc-overview-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.acc-card-header {
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex; align-items: center; justify-content: space-between;
}
.acc-card-header-title {
  font-size: 11px; font-weight: 800;
  color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.acc-card-header-link {
  font-size: 12px; font-weight: 700;
  color: #046EF2;
  background: none; border: none; cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: opacity 0.12s;
}
.acc-card-header-link:hover { opacity: 0.75; }

.acc-card-body { padding: 18px; }

/* Account details card */
.acc-details-name {
  font-size: 16px; font-weight: 800;
  color: #111; letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.acc-details-email {
  font-size: 13px; color: #6B7280; font-weight: 500;
  margin-bottom: 10px;
}
.acc-details-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.acc-details-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700;
  background: rgba(4,110,242,0.08);
  color: #046EF2;
}

/* Store card */
.acc-store-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 10px;
  margin-bottom: 14px;
}
.acc-store-name {
  font-size: 16px; font-weight: 900;
  color: #111; letter-spacing: -0.02em;
  margin-bottom: 3px;
}
.acc-store-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #6B7280;
}
.acc-store-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
}
.acc-plan-badge {
  padding: 4px 11px; border-radius: 100px;
  font-size: 11px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.05em;
  flex-shrink: 0;
}
.acc-store-btns {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.acc-store-btn {
  padding: 9px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 800;
  cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 6px;
  transition: opacity 0.15s, transform 0.1s;
  border: none;
}
.acc-store-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.acc-store-btn--primary { background: #046EF2; color: #fff; box-shadow: 0 3px 10px rgba(4,110,242,0.28); }
.acc-store-btn--ghost   { background: rgba(4,110,242,0.07); color: #046EF2; border: 1.5px solid rgba(4,110,242,0.2); }

/* Get a store CTA card */
.acc-get-store-card {
  background: linear-gradient(135deg, #046EF2 0%, #0357C7 100%);
  border-radius: 12px;
  padding: 22px 18px;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
}
.acc-get-store-card:hover { opacity: 0.92; }
.acc-get-store-title { font-size: 16px; font-weight: 900; color: #fff; letter-spacing: -0.02em; margin-bottom: 4px; }
.acc-get-store-sub   { font-size: 13px; color: rgba(255,255,255,0.75); font-weight: 500; margin-bottom: 14px; line-height: 1.5; }
.acc-get-store-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 8px;
  background: #fff; color: #046EF2;
  font-size: 13px; font-weight: 800; border: none;
  font-family: inherit; cursor: pointer;
}

/* Orders card */
.acc-orders-empty { font-size: 13px; color: #9CA3AF; font-weight: 500; }
.acc-order-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  font-size: 13px;
}
.acc-order-row:last-child { border-bottom: none; padding-bottom: 0; }
.acc-order-id    { font-weight: 700; color: #111; }
.acc-order-meta  { font-size: 11px; color: #9CA3AF; font-weight: 500; margin-top: 2px; }
.acc-order-status-badge {
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 800;
  white-space: nowrap;
}

/* Address card */
.acc-address-empty { font-size: 13px; color: #9CA3AF; margin-bottom: 12px; }
.acc-add-link {
  font-size: 13px; font-weight: 700; color: #046EF2;
  background: none; border: none; cursor: pointer;
  font-family: inherit; padding: 0;
  display: flex; align-items: center; gap: 5px;
}
.acc-add-link:hover { text-decoration: underline; }
.acc-address-preview {
  font-size: 13px; color: #374151; font-weight: 600; line-height: 1.6;
  margin-bottom: 10px;
}

/* Saved / notifications count tiles */
.acc-count-tiles { display: flex; gap: 12px; }
.acc-count-tile {
  flex: 1; background: #F0F6FF; border-radius: 10px;
  padding: 14px 12px; text-align: center;
  cursor: pointer; border: none; font-family: inherit;
  transition: background 0.15s;
}
.acc-count-tile:hover { background: #DBEAFE; }
.acc-count-num  { font-size: 22px; font-weight: 900; color: #046EF2; letter-spacing: -0.03em; }
.acc-count-lbl  { font-size: 11px; font-weight: 700; color: #6B7280; margin-top: 3px; }

/* Preferences card */
.acc-prefs-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.acc-pref-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 100px;
  background: rgba(4,110,242,0.07);
  border: 1.5px solid rgba(4,110,242,0.15);
  font-size: 11px; font-weight: 700; color: #046EF2;
}
.acc-prefs-empty { font-size: 13px; color: #9CA3AF; margin-bottom: 12px; }

/* Profile complete banner */
.acc-complete-banner {
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px;
  font-size: 13px; font-weight: 600; color: #166534;
}
.acc-complete-banner svg { flex-shrink: 0; color: #22C55E; }

/* ================================================================
   MOBILE HEADER BAR (replaces sidebar on mobile)
================================================================ */
.acc-mobile-header {
  display: none;
  background: linear-gradient(135deg, #046EF2 0%, #0357C7 100%);
  padding: 20px 18px 16px;
}
.acc-mobile-header-inner { display: flex; align-items: center; gap: 14px; }
.acc-mobile-avatar {
  width: 50px; height: 50px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 900; color: #fff;
  border: 2px solid rgba(255,255,255,0.4);
  flex-shrink: 0;
}
.acc-mobile-name  { font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -0.02em; }
.acc-mobile-badge { font-size: 11px; color: rgba(255,255,255,0.75); font-weight: 600; margin-top: 2px; }
.acc-mobile-edit  {
  margin-left: auto;
  background: rgba(255,255,255,0.18); border: none;
  border-radius: 8px; padding: 8px 14px;
  font-size: 12px; font-weight: 800; color: #fff;
  font-family: inherit; cursor: pointer;
  flex-shrink: 0;
}

/* Mobile horizontal nav tabs */
.acc-mobile-tabs {
  display: none;
  overflow-x: auto;
  padding: 12px 18px 0;
  gap: 6px;
  scrollbar-width: none;
}
.acc-mobile-tabs::-webkit-scrollbar { display: none; }
.acc-mobile-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 100px;
  border: 1.5px solid rgba(0,0,0,0.1);
  background: #fff;
  font-size: 13px; font-weight: 700;
  color: #374151; white-space: nowrap;
  cursor: pointer; font-family: inherit;
  flex-shrink: 0;
  transition: all 0.15s;
}
.acc-mobile-tab--active {
  background: #046EF2; color: #fff; border-color: #046EF2;
}

/* ================================================================
   RESPONSIVE
================================================================ */
@media (max-width: 860px) {
  .acc-layout {
    grid-template-columns: 1fr;
    padding: 0 0 24px;
    gap: 0;
  }
  .acc-sidebar       { display: none; }
  .acc-mobile-header { display: block; }
  .acc-mobile-tabs   { display: flex; }
  .acc-main { padding: 16px 14px; }
  .acc-overview-grid { grid-template-columns: 1fr; }
  .acc-main-title { font-size: 17px; margin-bottom: 14px; }
}

@media (max-width: 480px) {
  .acc-count-tiles { gap: 8px; }
  .acc-store-btns  { flex-direction: column; }
  .acc-store-btn   { justify-content: center; }
}

/* ================================================================
   MODALS & SHEETS (unchanged)
================================================================ */
.acc-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 900; display: flex; align-items: flex-end; }
.acc-modal {
  width: 100%; max-height: 92vh;
  background: #fff; border-radius: 20px 20px 0 0;
  padding: 0 20px 48px; overflow-y: auto;
}
.acc-modal__head {
  position: sticky; top: 0; background: #fff;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0 14px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  margin-bottom: 22px; z-index: 1;
}
.acc-modal__title { font-size: 18px; font-weight: 900; letter-spacing: -0.03em; color: #111; margin: 0; }
.acc-modal__close { width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #111; flex-shrink: 0; }
.acc-modal__close:hover { background: rgba(0,0,0,0.1); }
.acc-modal__section { margin-bottom: 22px; }
.acc-modal__label { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #9CA3AF; margin: 0 0 10px; }
.acc-modal__input { width: 100%; padding: 13px 16px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.1); background: #F9FAFB; color: #111; font-size: 15px; font-weight: 600; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
.acc-modal__input:focus { border-color: #046EF2; box-shadow: 0 0 0 3px rgba(4,110,242,0.1); background: #fff; }
.acc-modal__input:disabled { opacity: 0.45; cursor: not-allowed; }
.acc-modal__charcount { display: block; font-size: 10px; color: #9CA3AF; text-align: right; margin-top: 5px; }
.acc-modal__pills { display: flex; flex-wrap: wrap; gap: 8px; }
.acc-modal__pill { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.1); background: transparent; color: #374151; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s; }
.acc-modal__pill--on { background: #046EF2; border-color: #046EF2; color: #fff; box-shadow: 0 4px 12px rgba(4,110,242,0.28); }
.acc-modal__pill:disabled { opacity: 0.4; cursor: not-allowed; }
.acc-modal__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.acc-modal__pref { position: relative; display: flex; align-items: center; gap: 8px; padding: 13px 12px; border-radius: 12px; border: 1.5px solid rgba(0,0,0,0.08); background: transparent; color: #374151; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; text-align: left; transition: all 0.15s; }
.acc-modal__pref:hover { border-color: #046EF2; background: rgba(4,110,242,0.04); }
.acc-modal__pref--on  { border-color: #046EF2; background: rgba(4,110,242,0.07); color: #046EF2; }
.acc-modal__pref-tick { position: absolute; top: 7px; right: 7px; width: 18px; height: 18px; border-radius: 50%; background: #046EF2; display: flex; align-items: center; justify-content: center; }
.acc-modal__err { padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); color: #DC2626; margin-bottom: 16px; }
.acc-modal__save { width: 100%; padding: 15px; border-radius: 10px; background: #046EF2; color: #fff; font-size: 14px; font-weight: 800; font-family: inherit; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(4,110,242,0.35); transition: opacity 0.15s; }
.acc-modal__save:hover:not(:disabled)  { opacity: 0.9; }
.acc-modal__save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

.acc-sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 800; display: flex; align-items: flex-end; }
.acc-sheet { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 20px 20px 48px; }
.acc-sheet__bar { width: 36px; height: 4px; background: rgba(0,0,0,0.12); border-radius: 4px; margin: 0 auto 22px; }
.acc-sheet__title { font-size: 20px; font-weight: 900; letter-spacing: -0.03em; color: #111; margin: 0 0 7px; }
.acc-sheet__sub   { font-size: 14px; color: #6B7280; margin: 0 0 26px; line-height: 1.6; font-weight: 500; }
.acc-sheet__btn   { width: 100%; padding: 15px; border-radius: 10px; font-weight: 800; font-size: 14px; font-family: inherit; border: none; cursor: pointer; margin-bottom: 10px; transition: opacity 0.15s; }
.acc-sheet__btn:last-child { margin-bottom: 0; }
.acc-sheet__btn:hover { opacity: 0.88; }
.acc-sheet__btn--danger { background: #EF4444; color: #fff; }
.acc-sheet__btn--cancel { background: rgba(0,0,0,0.06); color: #111; }

@keyframes acc-spin { to { transform: rotate(360deg); } }
.acc-spinner { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; flex-shrink: 0; animation: acc-spin 0.7s linear infinite; }

/* Dark mode */
body.dark .acc-page          { background: #111; }
body.dark .acc-sidebar       { background: #1A1A1A; border-color: rgba(255,255,255,0.07); }
body.dark .acc-sidebar-section { border-bottom-color: rgba(255,255,255,0.05); }
body.dark .acc-nav-link      { color: rgba(255,255,255,0.7); }
body.dark .acc-nav-link:hover { background: rgba(4,110,242,0.15); color: #60A5FA; }
body.dark .acc-nav-link--active { background: rgba(4,110,242,0.2); color: #60A5FA; }
body.dark .acc-nav-icon      { color: rgba(255,255,255,0.3); }
body.dark .acc-overview-card { background: #1A1A1A; border-color: rgba(255,255,255,0.07); }
body.dark .acc-card-header   { border-bottom-color: rgba(255,255,255,0.06); }
body.dark .acc-card-header-title { color: rgba(255,255,255,0.4); }
body.dark .acc-main-title    { color: #fff; }
body.dark .acc-details-name  { color: #fff; }
body.dark .acc-details-email { color: rgba(255,255,255,0.4); }
body.dark .acc-count-tile    { background: rgba(4,110,242,0.12); }
body.dark .acc-count-tile:hover { background: rgba(4,110,242,0.2); }
body.dark .acc-count-lbl     { color: rgba(255,255,255,0.4); }
body.dark .acc-address-empty { color: rgba(255,255,255,0.3); }
body.dark .acc-orders-empty  { color: rgba(255,255,255,0.3); }
body.dark .acc-order-id      { color: #fff; }
body.dark .acc-order-row     { border-bottom-color: rgba(255,255,255,0.06); }
body.dark .acc-modal         { background: #1A1A1A; }
body.dark .acc-modal__head   { background: #1A1A1A; border-bottom-color: rgba(255,255,255,0.06); }
body.dark .acc-modal__title  { color: #fff; }
body.dark .acc-modal__close  { background: rgba(255,255,255,0.08); color: #fff; }
body.dark .acc-modal__input  { background: #222; border-color: rgba(255,255,255,0.1); color: #fff; }
body.dark .acc-modal__input:focus { background: #2A2A2A; }
body.dark .acc-modal__pref   { border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
body.dark .acc-modal__pill   { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
body.dark .acc-sheet         { background: #1A1A1A; }
body.dark .acc-sheet__title  { color: #fff; }
body.dark .acc-sheet__sub    { color: rgba(255,255,255,0.5); }
body.dark .acc-sheet__btn--cancel { background: rgba(255,255,255,0.08); color: #fff; }
body.dark .acc-mobile-tabs   { background: #111; }
body.dark .acc-mobile-tab    { background: #1A1A1A; border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
body.dark .acc-store-btn--ghost { background: rgba(4,110,242,0.15); }


/* ─── Tab sections ─── */
.acc-tab-section { display:flex; flex-direction:column; gap:12px; }

.acc-empty-state {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:48px 24px; gap:12px;
  background:var(--card,#fff); border-radius:16px; border:1px solid rgba(0,0,0,0.07);
}
.acc-empty-icon  { color:rgba(0,0,0,0.15); margin-bottom:4px; }
.acc-empty-title { font-size:17px; font-weight:800; color:var(--text,#111); }
.acc-empty-sub   { font-size:14px; color:var(--muted,#9CA3AF); line-height:1.5; max-width:260px; }

.acc-primary-btn {
  padding:12px 28px; border-radius:12px; border:none;
  background:#046EF2; color:#fff; font-size:14px; font-weight:800;
  cursor:pointer; font-family:inherit; margin-top:4px;
  box-shadow:0 4px 14px rgba(4,110,242,0.3);
}

.acc-order-row--lg {
  display:flex; align-items:center; gap:12;
  background:var(--card,#fff); border-radius:12px;
  border:1px solid rgba(0,0,0,0.07); padding:14px 16px;
  gap:12px; width:100%; text-align:left; cursor:pointer;
  transition:box-shadow 0.15s;
}
.acc-order-row--lg:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }

.acc-view-all-btn {
  width:100%; padding:12px; border-radius:12px;
  border:1.5px solid rgba(4,110,242,0.25); background:rgba(4,110,242,0.04);
  color:#046EF2; font-size:14px; font-weight:700; cursor:pointer;
  font-family:inherit; text-align:center;
}

/* ─── Settings rows ─── */
.acc-settings-group {
  background:var(--card,#fff); border-radius:16px;
  border:1px solid rgba(0,0,0,0.07); overflow:hidden;
}
.acc-settings-group-title {
  font-size:11px; font-weight:800; text-transform:uppercase;
  letter-spacing:0.07em; color:var(--muted,#9CA3AF);
  padding:14px 16px 8px;
}
.acc-settings-row {
  display:flex; align-items:center; gap:12px;
  width:100%; padding:13px 16px; border:none; background:transparent;
  cursor:pointer; font-family:inherit; text-align:left;
  border-top:1px solid rgba(0,0,0,0.05); transition:background 0.1s;
}
.acc-settings-row:first-of-type { border-top:none; }
.acc-settings-row:hover { background:rgba(0,0,0,0.025); }
.acc-settings-row--danger .acc-settings-row-label { color:#EF4444; }
.acc-settings-row--danger .acc-settings-row-ico   { color:#EF4444; }
.acc-settings-row-ico {
  width:36px; height:36px; border-radius:9px; flex-shrink:0;
  background:rgba(0,0,0,0.05); display:flex; align-items:center;
  justify-content:center; color:var(--text,#333);
}
.acc-settings-row-info { flex:1; min-width:0; }
.acc-settings-row-label { font-size:14px; font-weight:700; color:var(--text,#111); }
.acc-settings-row-sub   { font-size:12px; color:var(--muted,#9CA3AF); margin-top:1px; }
.acc-settings-row-arr   { color:var(--muted,#C4C9D4); flex-shrink:0; }

.acc-badge-red {
  min-width:20px; height:20px; border-radius:100px; background:#EF4444;
  color:#fff; font-size:11px; font-weight:800; display:flex;
  align-items:center; justify-content:center; padding:0 6px; flex-shrink:0;
}


/* ── Account page: forms/tabs use black, buttons stay blue ── */
.acc-mobile-tab--active {
  color: #111 !important;
  border-bottom-color: #111 !important;
}
.acc-mobile-tab--active svg { stroke: #111 !important; }

.acc-nav-link--active {
  background: rgba(0,0,0,0.06) !important;
  color: #111 !important;
}
.acc-nav-link--active svg { stroke: #111 !important; }

.acc-card-header-link {
  color: #111 !important;
  font-weight: 700;
}
.acc-card-header-link:hover { color: #111; text-decoration: underline; }

.acc-add-link { color: #111 !important; }
.acc-add-link:hover { color: #111; }

.acc-details-pill {
  background: rgba(0,0,0,0.06) !important;
  color: #333 !important;
  border-color: rgba(0,0,0,0.1) !important;
}

.acc-pref-chip {
  background: rgba(0,0,0,0.06) !important;
  color: #333 !important;
  border-color: rgba(0,0,0,0.1) !important;
}

/* Settings rows — icon bg dark not blue */
.acc-settings-row-ico { background: rgba(0,0,0,0.06) !important; color: #333 !important; }
.acc-settings-row-arr { color: #C4C9D4 !important; }
.acc-settings-row--danger .acc-settings-row-ico { background: rgba(239,68,68,0.08) !important; color: #EF4444 !important; }

/* View-all and primary action buttons stay blue */
.acc-view-all-btn { border-color: rgba(0,0,0,0.15) !important; color: #111 !important; background: rgba(0,0,0,0.03) !important; }
.acc-primary-btn  { background: #111 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important; }

/* Store buttons — keep dark primary, ghost stays neutral */
.acc-store-btn--primary { background: #111 !important; }

/* Count tiles — dark active color */
.acc-count-tile:hover { border-color: #111 !important; }
.acc-count-num { color: #111 !important; }

/* Get-a-store card CTA — black */
.acc-get-store-cta { color: #111 !important; }
.acc-get-store-title { color: #111 !important; }