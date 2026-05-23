/* ================================================================
   FILE: functions/src/auth/twoFactor.js
   TOTP (Google Authenticator) setup + verification
   All secrets are AES-256-GCM encrypted before storing in Firestore.
   Requires:
     - npm install otplib          (in functions/)
     - firebase functions:secrets:set TOTP_ENCRYPTION_KEY
       → generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
================================================================ */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin                  = require("firebase-admin");
const otplib                 = require("otplib");
const authenticator          = otplib.authenticator;
const crypto                 = require("crypto");

const ALGORITHM = "aes-256-gcm";

/* ── Encryption helpers ── */
function getKey() {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).");
  }
  return Buffer.from(key, "hex");
}

function encrypt(plaintext) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let enc      = cipher.update(plaintext, "utf8", "hex");
  enc         += cipher.final("hex");
  const tag    = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${enc}`;
}

function decrypt(payload) {
  const [ivHex, tagHex, enc] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM, getKey(), Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let dec  = decipher.update(enc, "hex", "utf8");
  dec     += decipher.final("utf8");
  return dec;
}

/* ════════════════════════════════════════════════════════════
   setupTOTP
   Called when seller opens the "Set up Authenticator" screen.
   Generates a fresh secret, stores it encrypted as "pending"
   (not live until they verify one code), returns the otpauth
   URL so the frontend can render a QR code.
════════════════════════════════════════════════════════════ */
exports.setupTOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const uid   = request.auth.uid;
  const email = request.auth.token.email || uid;

  const secret   = authenticator.generateSecret(20);
  const otpauth  = authenticator.keyuri(email, "Beme Market", secret);
  const db       = admin.firestore();

  await db.collection("users").doc(uid).set({
    mfa: {
      pendingSecret: encrypt(secret),
      enabled: false,
    },
  }, { merge: true });

  console.log(`[totp] setupTOTP called for uid=${uid}`);
  return { otpauth, secret };
});

/* ════════════════════════════════════════════════════════════
   enableTOTP
   Verifies first code then promotes pendingSecret → live secret
   and sets mfa.enabled = true.
════════════════════════════════════════════════════════════ */
exports.enableTOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const { code } = request.data;
  if (!code || typeof code !== "string") {
    throw new HttpsError("invalid-argument", "A 6-digit code is required.");
  }

  const uid  = request.auth.uid;
  const db   = admin.firestore();
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.pendingSecret) {
    throw new HttpsError("not-found", "No pending TOTP setup found. Start setup again.");
  }

  let secret;
  try {
    secret = decrypt(data.mfa.pendingSecret);
  } catch {
    throw new HttpsError("internal", "Could not read stored secret. Start setup again.");
  }

  authenticator.options = { window: 1 };
  const isValid = authenticator.verify({ token: code.trim(), secret });
  if (!isValid) {
    throw new HttpsError("invalid-argument", "Code is incorrect or expired. Try again.");
  }

  await db.collection("users").doc(uid).set({
    mfa: {
      secret:        encrypt(secret),
      pendingSecret: admin.firestore.FieldValue.delete(),
      enabled:       true,
      enabledAt:     admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  console.log(`[totp] MFA enabled for uid=${uid}`);
  return { success: true };
});

/* ════════════════════════════════════════════════════════════
   verifyTOTP
   Called during login after password auth succeeds.
   Returns { valid: true } or { valid: false, error: "..." }.
════════════════════════════════════════════════════════════ */
exports.verifyTOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const { code } = request.data;
  if (!code || typeof code !== "string") {
    return { valid: false, error: "Enter the 6-digit code from your authenticator app." };
  }

  const uid  = request.auth.uid;
  const db   = admin.firestore();
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.enabled || !data?.mfa?.secret) {
    return { valid: true };
  }

  let secret;
  try {
    secret = decrypt(data.mfa.secret);
  } catch {
    throw new HttpsError("internal", "Could not verify code. Contact support.");
  }

  authenticator.options = { window: 1 };
  const isValid = authenticator.verify({ token: code.trim(), secret });

  if (!isValid) {
    console.warn(`[totp] Invalid code attempt for uid=${uid}`);
    return { valid: false, error: "Incorrect code. Check your authenticator app and try again." };
  }

  console.log(`[totp] Code verified for uid=${uid}`);
  return { valid: true };
});

/* ════════════════════════════════════════════════════════════
   disableTOTP
   Requires one last valid code before disabling.
════════════════════════════════════════════════════════════ */
exports.disableTOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const { code } = request.data;
  if (!code || typeof code !== "string") {
    throw new HttpsError("invalid-argument", "Enter your current authenticator code to confirm.");
  }

  const uid  = request.auth.uid;
  const db   = admin.firestore();
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.enabled || !data?.mfa?.secret) {
    throw new HttpsError("not-found", "MFA is not currently enabled.");
  }

  let secret;
  try {
    secret = decrypt(data.mfa.secret);
  } catch {
    throw new HttpsError("internal", "Could not verify code.");
  }

  authenticator.options = { window: 1 };
  const isValid = authenticator.verify({ token: code.trim(), secret });
  if (!isValid) {
    throw new HttpsError("invalid-argument", "Incorrect code. MFA not disabled.");
  }

  await db.collection("users").doc(uid).set({
    mfa: {
      enabled:    false,
      secret:     admin.firestore.FieldValue.delete(),
      disabledAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  console.log(`[totp] MFA disabled for uid=${uid}`);
  return { success: true };
});