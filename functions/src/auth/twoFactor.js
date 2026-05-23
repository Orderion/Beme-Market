/* ================================================================
   FILE: functions/src/auth/twoFactor.js
================================================================ */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin                  = require("firebase-admin");
const crypto                 = require("crypto");

const ALGORITHM   = "aes-256-gcm";
const SECRET_OPTS = { secrets: ["TOTP_ENCRYPTION_KEY"] };

/* ── TOTP helpers (no otplib — pure crypto, works on any Node version) ── */
function base32Decode(str) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0;
  const out = [];
  const s = str.replace(/=+$/, "").toUpperCase();
  for (let i = 0; i < s.length; i++) {
    val = (val << 5) | alpha.indexOf(s[i]);
    bits += 5;
    if (bits >= 8) { bits -= 8; out.push((val >> bits) & 0xff); }
  }
  return Buffer.from(out);
}

function base32Encode(buf) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0, out = "";
  for (let i = 0; i < buf.length; i++) {
    val = (val << 8) | buf[i];
    bits += 8;
    while (bits >= 5) { bits -= 5; out += alpha[(val >> bits) & 31]; }
  }
  if (bits > 0) out += alpha[(val << (5 - bits)) & 31];
  return out;
}

function generateSecret(byteLen = 20) {
  return base32Encode(crypto.randomBytes(byteLen));
}

function generateTOTP(secretB32, window = 0) {
  const key     = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  const buf     = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac  = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code  = ((hmac[offset] & 0x7f) << 24 |
                  hmac[offset+1] << 16 |
                  hmac[offset+2] << 8  |
                  hmac[offset+3]) % 1_000_000;
  return String(code).padStart(6, "0");
}

function verifyCode(secretB32, token) {
  const t = String(token).trim();
  for (const w of [-1, 0, 1]) {
    if (generateTOTP(secretB32, w) === t) return true;
  }
  return false;
}

function keyuri(email, issuer, secret) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
         `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
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

  const uid    = request.auth.uid;
  const email  = request.auth.token.email || uid;
  const secret = generateSecret(20);
  const otpauth = keyuri(email, "Beme Market", secret);

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

  if (!verifyCode(secret, code))
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

  if (!verifyCode(secret, code)) {
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

  if (!verifyCode(secret, code))
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