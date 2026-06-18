// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";

// Sentry — initialized defensively so a bundling/tree-shake quirk in the
// vendor chunk can never take down the whole app at boot. Only runs when a
// DSN is present, lazily, and never throws into the render path.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  import("@sentry/react")
    .then((Sentry) => {
      try {
        Sentry.init({
          dsn: SENTRY_DSN,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
          integrations: [Sentry.browserTracingIntegration()],
        });
      } catch (e) {
        console.error("[Sentry] init skipped:", e);
      }
    })
    .catch((e) => console.error("[Sentry] load skipped:", e));
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element "#root" not found');
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);