/* ============================================================
   FILE: src/components/LoaderOverlay.jsx
   BEME wordmark — blue wavy water fills letters from the bottom
   - Wave ripples horizontally while rising (two independent anims)
   - Outline: solid black (light) / solid white (dark)
   - Phrase carousel + tick dots — logic unchanged
============================================================ */
import { useEffect, useState } from "react";
import "./LoaderOverlay.css";

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

  const [render,    setRender]    = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseIn,  setPhraseIn]  = useState(true);

  /* Mount / unmount with exit-animation delay */
  useEffect(() => {
    let t;
    if (visible) { setRender(true); }
    else         { t = setTimeout(() => setRender(false), 400); }
    return () => clearTimeout(t);
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

  return (
    <div
      className={`ldr-overlay${visible ? " ldr-overlay--show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={`${subtext} loading`}
    >
      <div className="ldr-backdrop" />

      <div className="ldr-center">

        {/* ── BEME wordmark with wavy water fill ── */}
        <svg
          className="ldr-wordmark"
          viewBox="0 0 400 130"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ldr-blue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#8FE3FF" />
              <stop offset="48%"  stopColor="#2BBFD9" />
              <stop offset="100%" stopColor="#0B57D6" />
            </linearGradient>

            {/* Clip to the exact letter shapes */}
            <clipPath id="ldr-beme-clip">
              <text
                x="200" y="108"
                textAnchor="middle"
                fontFamily="'Big Shoulders Display', system-ui, sans-serif"
                fontWeight="900"
                fontSize="105"
              >BEME</text>
            </clipPath>
          </defs>

          {/* Letter outlines — black in light, white in dark */}
          <text
            x="200" y="108"
            textAnchor="middle"
            fontFamily="'Big Shoulders Display', system-ui, sans-serif"
            fontWeight="900"
            fontSize="105"
            fill="none"
            className="ldr-beme-outline"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          >BEME</text>

          {/* Water fill — clipped to letter shapes */}
          <g clipPath="url(#ldr-beme-clip)">
            <g className="ldr-rise">

              {/* Wave path scrolls horizontally while parent rises */}
              <g className="ldr-ripple">
                <path
                  d="M -320,0
                     C -267,-15 -213,15 -160,0
                     C -107,-15  -53,15    0,0
                     C   53,-15  107,15  160,0
                     C  213,-15  267,15  320,0
                     C  373,-15  427,15  480,0
                     C  533,-15  587,15  640,0
                     C  693,-15  747,15  800,0
                     L 800,220 L -320,220 Z"
                  fill="url(#ldr-blue-grad)"
                />
              </g>

              {/* Rising bubbles inside letters */}
              <circle className="ldr-bub ldr-bub--1" cx="72"  r="3.5" fill="rgba(255,255,255,.6)" />
              <circle className="ldr-bub ldr-bub--2" cx="158" r="2.5" fill="rgba(255,255,255,.5)" />
              <circle className="ldr-bub ldr-bub--3" cx="262" r="3"   fill="rgba(255,255,255,.55)" />
              <circle className="ldr-bub ldr-bub--4" cx="338" r="2.8" fill="rgba(255,255,255,.5)" />
            </g>
          </g>
        </svg>

        {/* ── Caption ── */}
        <div className="ldr-caption">
          <span className={`ldr-phrase${phraseIn ? "" : " ldr-phrase--out"}`}>
            {label || PHRASES[phraseIdx]}
          </span>
          <span className="ldr-tick-dots" aria-hidden="true">
            <span className="ldr-td ldr-td--1" />
            <span className="ldr-td ldr-td--2" />
            <span className="ldr-td ldr-td--3" />
          </span>
        </div>

      </div>
    </div>
  );
}