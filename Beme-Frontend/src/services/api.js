// src/services/api.js
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:5000";

const API = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: false, // set true ONLY if you use cookies/sessions
  timeout: 20000,
});

// Optional: attach auth token if you use Firebase Auth (ID token)
API.interceptors.request.use(async (config) => {
  try {
    // If you don’t use firebase in the frontend, delete this whole interceptor.
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

export default API;

/* =========================
   Convenience helpers
   ========================= */

// Paystack
export const paystackInit = (payload) => API.post("/paystack/initialize", payload);
export const paystackVerify = (reference) => API.get(`/paystack/verify/${reference}`);

// Auth (example)
export const login = (payload) => API.post("/auth/login", payload);
export const register = (payload) => API.post("/auth/register", payload);