// src/components/icons/SellerIcons.jsx
// All SVG icons used across seller pages — no emojis anywhere
// Usage: import { IconFashion, IconZap, ... } from "../components/icons/SellerIcons";

const def = {
  fill: "none",
  strokeWidth: "1.6",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 24, color = "currentColor", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...def}>
      {children}
    </svg>
  );
}

/* ── Business type icons ─────────────────────────────────────────────────── */
export function IconFashion({ size, color }) {
  return <Svg size={size} color={color}><path d="M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z"/></Svg>;
}
export function IconSneakers({ size, color }) {
  return <Svg size={size} color={color}><path d="M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z"/><path d="M6 15V9l4-4h4"/></Svg>;
}
export function IconJewelry({ size, color }) {
  return <Svg size={size} color={color}><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></Svg>;
}
export function IconCosmetics({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s4-2 4-7V8l-4-6-4 6v7c0 5 4 7 4 7z"/><path d="M8 8h8"/></Svg>;
}
export function IconHair({ size, color }) {
  return <Svg size={size} color={color}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></Svg>;
}
export function IconFood({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></Svg>;
}
export function IconElectronics({ size, color }) {
  return <Svg size={size} color={color}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></Svg>;
}
export function IconHome({ size, color }) {
  return <Svg size={size} color={color}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></Svg>;
}
export function IconArts({ size, color }) {
  return <Svg size={size} color={color}><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></Svg>;
}
export function IconDigital({ size, color }) {
  return <Svg size={size} color={color}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>;
}
export function IconServices({ size, color }) {
  return <Svg size={size} color={color}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Svg>;
}
export function IconHealth({ size, color }) {
  return <Svg size={size} color={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>;
}
export function IconHandmade({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></Svg>;
}
export function IconOther({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
}

/* ── Marketing / dashboard tool icons ────────────────────────────────────── */
export function IconZap({ size, color }) {
  return <Svg size={size} color={color}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
}
export function IconTag({ size, color }) {
  return <Svg size={size} color={color}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Svg>;
}
export function IconRocket({ size, color }) {
  return <Svg size={size} color={color}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></Svg>;
}
export function IconBrain({ size, color }) {
  return <Svg size={size} color={color}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></Svg>;
}
export function IconUsers({ size, color }) {
  return <Svg size={size} color={color}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>;
}
export function IconStar({ size, color }) {
  return <Svg size={size} color={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
}

/* ── Status / badge icons ────────────────────────────────────────────────── */
export function IconLock({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
}
export function IconUnlock({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></Svg>;
}
export function IconShield({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>;
}
export function IconShieldCheck({ size, color }) {
  return <Svg size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></Svg>;
}
export function IconCheck({ size, color }) {
  return <Svg size={size} color={color}><polyline points="20 6 9 17 4 12"/></Svg>;
}
export function IconCheckCircle({ size, color }) {
  return <Svg size={size} color={color}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Svg>;
}
export function IconAlertTriangle({ size, color }) {
  return <Svg size={size} color={color}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
}
export function IconBell({ size, color }) {
  return <Svg size={size} color={color}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>;
}
export function IconInfo({ size, color }) {
  return <Svg size={size} color={color}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Svg>;
}

/* ── File / upload icons ─────────────────────────────────────────────────── */
export function IconUpload({ size, color }) {
  return <Svg size={size} color={color}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></Svg>;
}
export function IconImage({ size, color }) {
  return <Svg size={size} color={color}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Svg>;
}
export function IconFile({ size, color }) {
  return <Svg size={size} color={color}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></Svg>;
}
export function IconPaperclip({ size, color }) {
  return <Svg size={size} color={color}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Svg>;
}

/* ── Commerce icons ──────────────────────────────────────────────────────── */
export function IconPackage({ size, color }) {
  return <Svg size={size} color={color}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
}
export function IconShoppingBag({ size, color }) {
  return <Svg size={size} color={color}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Svg>;
}
export function IconChat({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>;
}
export function IconWallet({ size, color }) {
  return <Svg size={size} color={color}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12h.01"/></Svg>;
}
export function IconStore({ size, color }) {
  return <Svg size={size} color={color}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></Svg>;
}
export function IconChart({ size, color }) {
  return <Svg size={size} color={color}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></Svg>;
}
export function IconTrendingUp({ size, color }) {
  return <Svg size={size} color={color}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Svg>;
}
export function IconTrendingDown({ size, color }) {
  return <Svg size={size} color={color}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></Svg>;
}
export function IconDollar({ size, color }) {
  return <Svg size={size} color={color}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Svg>;
}

/* ── Convenience: icon map by id ─────────────────────────────────────────── */
export const BUSINESS_ICONS = {
  fashion:     IconFashion,
  sneakers:    IconSneakers,
  jewelry:     IconJewelry,
  cosmetics:   IconCosmetics,
  hair:        IconHair,
  food:        IconFood,
  electronics: IconElectronics,
  home:        IconHome,
  arts:        IconArts,
  digital:     IconDigital,
  services:    IconServices,
  health:      IconHealth,
  handmade:    IconHandmade,
  other:       IconOther,
};

export const MARKETING_ICONS = {
  flash:    IconZap,
  discount: IconTag,
  boost:    IconRocket,
  ai:       IconBrain,
  referral: IconUsers,
  loyalty:  IconStar,
};

