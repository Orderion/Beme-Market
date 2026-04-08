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

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

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
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }
}