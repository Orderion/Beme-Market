import crypto from "crypto";

const CLOUD   = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.VITE_CLOUDINARY_API_KEY;
const SECRET  = process.env.VITE_CLOUDINARY_API_SECRET;

const basicAuth = () =>
  "Basic " + Buffer.from(`${API_KEY}:${SECRET}`).toString("base64");

export default async function handler(req, res) {
  /* ── CORS ── */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  /* ── Guard: env vars present ── */
  if (!CLOUD || !API_KEY || !SECRET) {
    return res.status(500).json({
      error: "Server is missing VITE_CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET env vars.",
    });
  }

  const { action, type } = req.query;

  try {
    /* ── GET /api/cloudinary?action=usage ── */
    if (action === "usage" && req.method === "GET") {
      const r = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/usage`,
        { headers: { Authorization: basicAuth() } }
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    /* ── GET /api/cloudinary?action=resources&type=image|video ── */
    if (action === "resources" && req.method === "GET") {
      if (!type) return res.status(400).json({ error: "Missing ?type=" });

      let all = [], cursor = "";
      do {
        const url =
          `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${type}` +
          `?max_results=100${cursor ? "&next_cursor=" + cursor : ""}`;
        const r = await fetch(url, { headers: { Authorization: basicAuth() } });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          return res
            .status(r.status)
            .json({ error: e.error?.message || `HTTP ${r.status}` });
        }
        const d = await r.json();
        all    = all.concat(d.resources || []);
        cursor = d.next_cursor || "";
      } while (cursor);

      return res.status(200).json({ resources: all });
    }

    /* ── POST /api/cloudinary?action=delete ── */
    if (action === "delete" && req.method === "POST") {
      const { publicId, resourceType } = req.body;
      if (!publicId || !resourceType)
        return res.status(400).json({ error: "Missing publicId or resourceType" });

      const ts     = Math.floor(Date.now() / 1000);
      const sigStr = `public_ids[]=${publicId}&timestamp=${ts}${SECRET}`;
      const sig    = crypto.createHash("sha1").update(sigStr).digest("hex");

      const body = new URLSearchParams({ timestamp: ts, signature: sig, api_key: API_KEY });
      body.append("public_ids[]", publicId);

      const r = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}/upload`,
        { method: "DELETE", body }
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(400).json({ error: `Unknown action: "${action}"` });
  } catch (e) {
    console.error("[cloudinary api]", e);
    return res.status(500).json({ error: e.message });
  }
}