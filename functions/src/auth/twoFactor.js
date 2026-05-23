/* ================================================================
   FILE: functions/src/auth/twoFactor.js
================================================================ */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin                  = require("firebase-admin");
const crypto                 = require("crypto");

const ALGORITHM   = "aes-256-gcm";
const SECRET_OPTS = { secrets: ["TOTP_ENCRYPTION_KEY"] };

/* ── Lazy authenticator — required inside handler, not at module load ── */
function getAuth() {
  const { authenticator } = require("otplib");
  authenticator.options = { window: 1 };
  return authenticator;
}

/* ── Encryption ── */
function getKey() {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length !== 64) throw new Error("TOTP_ENCRYPTION_KEY missing or invalid.");
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
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let dec  = decipher.update(enc, "hex", "utf8");
  dec     += decipher.final("utf8");
  return dec;
}

/* ════════════════════════
   setupTOTP
════════════════════════ */
exports.setupTOTP = onCall(SECRET_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const auth  = getAuth();
  const uid   = request.auth.uid;
  const email = request.auth.token.email || uid;

  const secret  = auth.generateSecret(20);
  const otpauth = auth.keyuri(email, "Beme Market", secret);

  await admin.firestore().collection("users").doc(uid).set({
    mfa: { pendingSecret: encrypt(secret), enabled: false },
  }, { merge: true });

  console.log(`[totp] setupTOTP uid=${uid}`);
  return { otpauth, secret };
});

/* ════════════════════════
   enableTOTP
════════════════════════ */
exports.enableTOTP = onCall(SECRET_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const { code } = request.data;
  if (!code || typeof code !== "string")
    throw new HttpsError("invalid-argument", "A 6-digit code is required.");

  const uid  = request.auth.uid;
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.pendingSecret)
    throw new HttpsError("not-found", "No pending TOTP setup. Start setup again.");

  let secret;
  try { secret = decrypt(data.mfa.pendingSecret); }
  catch { throw new HttpsError("internal", "Could not read stored secret. Start setup again."); }

  if (!getAuth().verify({ token: code.trim(), secret }))
    throw new HttpsError("invalid-argument", "Code is incorrect or expired. Try again.");

  await admin.firestore().collection("users").doc(uid).set({
    mfa: {
      secret:        encrypt(secret),
      pendingSecret: admin.firestore.FieldValue.delete(),
      enabled:       true,
      enabledAt:     admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  console.log(`[totp] MFA enabled uid=${uid}`);
  return { success: true };
});

/* ════════════════════════
   verifyTOTP
════════════════════════ */
exports.verifyTOTP = onCall(SECRET_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const { code } = request.data;
  if (!code || typeof code !== "string")
    return { valid: false, error: "Enter the 6-digit code from your authenticator app." };

  const uid  = request.auth.uid;
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.enabled || !data?.mfa?.secret) return { valid: true };

  let secret;
  try { secret = decrypt(data.mfa.secret); }
  catch { throw new HttpsError("internal", "Could not verify code. Contact support."); }

  const isValid = getAuth().verify({ token: code.trim(), secret });

  if (!isValid) {
    console.warn(`[totp] Invalid code uid=${uid}`);
    return { valid: false, error: "Incorrect code. Check your authenticator app and try again." };
  }

  console.log(`[totp] Code verified uid=${uid}`);
  return { valid: true };
});

/* ════════════════════════
   disableTOTP
════════════════════════ */
exports.disableTOTP = onCall(SECRET_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const { code } = request.data;
  if (!code || typeof code !== "string")
    throw new HttpsError("invalid-argument", "Enter your current authenticator code to confirm.");

  const uid  = request.auth.uid;
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.data();

  if (!data?.mfa?.enabled || !data?.mfa?.secret)
    throw new HttpsError("not-found", "MFA is not currently enabled.");

  let secret;
  try { secret = decrypt(data.mfa.secret); }
  catch { throw new HttpsError("internal", "Could not verify code."); }

  if (!getAuth().verify({ token: code.trim(), secret }))
    throw new HttpsError("invalid-argument", "Incorrect code. MFA not disabled.");

  await admin.firestore().collection("users").doc(uid).set({
    mfa: {
      enabled:    false,
      secret:     admin.firestore.FieldValue.delete(),
      disabledAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  console.log(`[totp] MFA disabled uid=${uid}`);
  return { success: true };
});