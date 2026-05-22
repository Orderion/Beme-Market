/* ============================================================
   FILE: src/components/LoaderOverlay.jsx
   Blob loader — colored morphing blob + smooth orbiting dot
   - Color + icon cycles every 0.5s, starting from blue
   - Dot orbits in a perfect smooth circle (no stop/go)
   - Dark/light mode via CSS vars
============================================================ */
import { useEffect, useState } from "react";
import "./LoaderOverlay.css";

/* ── Cycles: start from blue, change every 500ms ── */
const CYCLES = [
  { color: "#2BBFD9", icon: "phone"      }, // blue   ← start
  { color: "#F5C400", icon: "shirt"      }, // yellow
  { color: "#8BC400", icon: "headphones" }, // lime
  { color: "#E84040", icon: "sneaker"    }, // red
  { color: "#FF8C00", icon: "shirt"      }, // orange
  { color: "#E8408C", icon: "sneaker"    }, // pink
  { color: "#046EF2", icon: "phone"      }, // deep blue
  { color: "#8BC400", icon: "headphones" }, // lime
  { color: "#F5C400", icon: "shirt"      }, // yellow
  { color: "#E84040", icon: "sneaker"    }, // coral
];

const PHRASES = [
  "Preparing your marketplace...",
  "Ghana's best online market",
  "Finding the best deals for you",
  "Your favourite sellers are ready",
  "Fast delivery across all regions",
  "Connecting buyers & sellers safely",
  "The marketplace made for Ghana",
  "Securing your experience...",
];

/* ── Icons ── */
function ShirtIcon() {
  return (
    <svg viewBox="0 0 32 28" fill="none" stroke="white" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C13 4.5 14.5 5.5 16 5.5C17.5 5.5 19 4.5 20 2L30 8.5L26 13.5V26H6V13.5L2 8.5Z"/>
    </svg>
  );
}
function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 28 24" fill="none" stroke="white" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13a11 11 0 0 1 22 0"/>
      <rect x="1.5" y="12" width="5" height="9" rx="2.5"/>
      <rect x="21.5" y="12" width="5" height="9" rx="2.5"/>
    </svg>
  );
}
function SneakerIcon() {
  return (
    <svg viewBox="0 0 36 22" fill="none" stroke="white" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 15.5C2 15.5 4 7.5 10.5 6H19L26 3C31 1.5 34.5 4.5 34.5 9.5L34.5 14C28 19 18 19.5 10 19.5H5.5C3.5 19.5 2 17.5 2 15.5Z"/>
      <path d="M13 6L16 11.5M19 6L19 11.5" strokeWidth="1.5"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="3"/>
      <circle cx="12" cy="18.5" r="1.1" fill="white" stroke="none"/>
    </svg>
  );
}

const ICON_MAP = {
  shirt:      <ShirtIcon/>,
  headphones: <HeadphonesIcon/>,
  sneaker:    <SneakerIcon/>,
  phone:      <PhoneIcon/>,
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function LoaderOverlay({
  show,
  isVisible,
  label   = "",
  subtext = "Beme Market",
}) {
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [render,      setRender]      = useState(false);
  const [cycleIdx,    setCycleIdx]    = useState(0);
  const [phraseIdx,   setPhraseIdx]   = useState(0);
  const [iconVisible, setIconVisible] = useState(true);
  const [phraseIn,    setPhraseIn]    = useState(true);

  /* Mount / unmount with exit-animation delay */
  useEffect(() => {
    let t;
    if (visible) { setRender(true); }
    else         { t = setTimeout(() => setRender(false), 400); }
    return () => clearTimeout(t);
  }, [visible]);

  /* Color + icon — every 500ms */
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setIconVisible(false);
      setTimeout(() => {
        setCycleIdx(i => (i + 1) % CYCLES.length);
        setIconVisible(true);
      }, 120); // fast crossfade
    }, 500);
    return () => clearInterval(id);
  }, [visible]);

  /* Phrase — every 2.8s */
  useEffect(() => {
    if (!visible || label) return;
    const id = setInterval(() => {
      setPhraseIn(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES.length);
        setPhraseIn(true);
      }, 340);
    }, 2800);
    return () => clearInterval(id);
  }, [visible, label]);

  if (!render) return null;

  const { color, icon } = CYCLES[cycleIdx];

  return (
    <div
      className={`ldr-overlay${visible ? " ldr-overlay--show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={`${subtext} loading`}
    >
      <div className="ldr-backdrop"/>

      <div className="ldr-center">

        {/* Stage */}
        <div className="ldr-stage" aria-hidden="true">
          <div className="ldr-blob" style={{ background: color }}>
            <span className={`ldr-icon${iconVisible ? "" : " ldr-icon--out"}`}>
              {ICON_MAP[icon]}
            </span>
          </div>
          <div className="ldr-dot" style={{ background: color }}/>
        </div>

        {/* Caption */}
        <div className="ldr-caption">
          <span className="ldr-brand">{subtext}</span>
          <span className={`ldr-phrase${phraseIn ? "" : " ldr-phrase--out"}`}>
            {label || PHRASES[phraseIdx]}
          </span>
          <span className="ldr-tick-dots" aria-hidden="true">
            <span className="ldr-td ldr-td--1"/>
            <span className="ldr-td ldr-td--2"/>
            <span className="ldr-td ldr-td--3"/>
          </span>
        </div>

      </div>
    </div>
  );
}