// src/middlewares/authMiddleware.js
import { firebaseAdmin } from "../firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || "").trim();

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization bearer token." });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({ error: "Missing Firebase ID token." });
    }

    // MODIFIED: checkRevoked=true so suspended/deleted accounts are blocked immediately
    // Firebase caches revocation status for ~5 min, so overhead is minimal
    const decoded = await firebaseAdmin.auth().verifyIdToken(token, true);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || "",
      picture: decoded.picture || "",
      emailVerified: decoded.email_verified === true,
      claims: decoded,
    };

    next();
  } catch (error) {
    // ADDED: distinguish revoked tokens from other auth errors
    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({ error: "Session revoked. Please sign in again." });
    }
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }
}s