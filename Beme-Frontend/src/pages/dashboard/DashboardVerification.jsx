import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

const BADGE_INFO = {
  none:     { label: "Unverified", color: "#8B8FA8", bg: "rgba(107,114,128,0.1)", icon: "🔓" },
  verified: { label: "Verified",   color: "#22C55E", bg: "rgba(34,197,94,0.1)",   icon: "✓" },
  pro:      { label: "Pro Seller", color: "#7C3AED", bg: "rgba(124,58,237,0.1)",  icon: "⭐" },
};

export default function DashboardVerification() {
  const { user }  = useAuth();
  const { storeId, shop } = useSellerAuth();

  const [existing, setExisting]       = useState(null);
  const [files, setFiles]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "verificationRequests"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc")))
      .then((snap) => {
        if (!snap.empty) setExisting({ id: snap.docs[0].id, ...snap.docs[0].data() });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const badge = BADGE_INFO[shop?.verifiedBadge || "none"];

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!agreed) { alert("Please agree to the verification terms."); return; }
    if (files.length === 0) { alert("Please upload at least one document."); return; }
    if (!storeId) return;

    setSubmitting(true);
    try {
      // Upload all docs to storage
      const uploadedUrls = [];
      for (const file of files) {
        setUploading(true);
        const fileRef = ref(storage, `verification/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push(url);
      }
      setUploading(false);

      // Create verification request
      const ref2 = await addDoc(collection(db, "verificationRequests"), {
        shopId: storeId,
        sellerId: user.uid,
        shopName: shop?.shopName || "",
        businessType: shop?.category || "",
        documents: uploadedUrls,
        status: "pending",
        adminNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
      });
      setExisting({ id: ref2.id, status: "pending", documents: uploadedUrls });
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#8B8FA8" }}>Loading…</div>;

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Store Verification</div>
        <div className="sd-page-sub">Earn a verified badge and build customer trust</div>
      </div>

      {/* Current badge */}
      <div className="sd-panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {badge.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Current Badge</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: badge.color, fontFamily: "'Space Grotesk', sans-serif" }}>{badge.label}</div>
            {shop?.verifiedBadge === "none" && <div style={{ fontSize: 12, color: "#8B8FA8", marginTop: 2 }}>Submit your documents to get verified.</div>}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="sd-panel" style={{ marginBottom: 14 }}>
        <div className="sd-panel-title" style={{ marginBottom: 14 }}>Why Get Verified?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { icon: "🛡️", title: "Build Trust",      desc: "Verified badge appears on your store and all products." },
            { icon: "📈", title: "More Sales",        desc: "Verified sellers rank higher in search results." },
            { icon: "💰", title: "Higher Limits",     desc: "Access higher withdrawal limits per week." },
            { icon: "🎯", title: "Boost Eligibility", desc: "Only verified sellers can use premium boosts." },
          ].map((b) => (
            <div key={b.title} style={{ padding: 14, borderRadius: 10, background: "rgba(4,110,242,0.05)", border: "1px solid rgba(4,110,242,0.1)" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D3B", marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "#8B8FA8", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Application */}
      {existing ? (
        <div className="sd-panel">
          <div className="sd-panel-title" style={{ marginBottom: 14 }}>Application Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span className={`sd-badge ${existing.status === "approved" ? "sd-badge-green" : existing.status === "rejected" ? "sd-badge-red" : "sd-badge-yellow"}`}>
              {existing.status === "pending" ? "Under Review" : existing.status === "approved" ? "Approved" : "Rejected"}
            </span>
            <span style={{ fontSize: 12, color: "#8B8FA8" }}>
              {existing.status === "pending" && "Your application is being reviewed. This usually takes 1–3 business days."}
              {existing.status === "approved" && "Congratulations! Your store is now verified."}
              {existing.status === "rejected" && `Reason: ${existing.adminNote || "Please resubmit with clearer documents."}`}
            </span>
          </div>
          {existing.documents?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Submitted Documents</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {existing.documents.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.05)", fontSize: 12, color: "#046EF2", fontWeight: 600 }}>
                    📄 Document {i + 1} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
          {existing.status === "rejected" && (
            <button className="sd-btn sd-btn-primary" style={{ marginTop: 16 }} onClick={() => setExisting(null)}>
              Resubmit Application
            </button>
          )}
        </div>
      ) : (
        <div className="sd-panel">
          <div className="sd-panel-title" style={{ marginBottom: 6 }}>Apply for Verification</div>
          <div style={{ fontSize: 13, color: "#8B8FA8", marginBottom: 20, lineHeight: 1.6 }}>
            Upload any 2 of the following: Ghana Card / Passport / Driver's License, Business Registration Certificate, Utility Bill (not older than 3 months), Bank Statement.
          </div>

          {/* Document upload */}
          <div className="sd-form-group">
            <label className="sd-label">Upload Documents (max 5 files)</label>
            <div className="sd-upload-zone" onClick={() => document.getElementById("verif-docs").click()}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", marginBottom: 4 }}>Click to upload documents</div>
              <div style={{ fontSize: 11, color: "#8B8FA8" }}>PNG, JPG, PDF — max 5MB each</div>
            </div>
            <input type="file" id="verif-docs" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileChange} />
            {files.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "rgba(4,110,242,0.08)", fontSize: 12, color: "#046EF2" }}>
                    📄 {f.name}
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agreement */}
          <div style={{ padding: "14px 16px", background: "rgba(0,0,0,0.03)", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
            <strong style={{ color: "#1A1D3B" }}>Verification Agreement</strong>
            <br />
            By submitting, I confirm that all documents provided are genuine and belong to me or my business. I understand that submitting false or forged documents may result in immediate account termination and legal action. Beme Market reserves the right to reject any application without explanation.
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
            <span style={{ fontSize: 13, color: "#1A1D3B" }}>I agree to the verification terms and confirm all documents are authentic.</span>
          </label>

          <button className="sd-btn sd-btn-primary" onClick={handleSubmit} disabled={submitting || uploading || files.length === 0 || !agreed} style={{ minWidth: 200 }}>
            {uploading ? "Uploading…" : submitting ? "Submitting…" : "Submit for Verification"}
          </button>
        </div>
      )}
    </div>
  );
}

