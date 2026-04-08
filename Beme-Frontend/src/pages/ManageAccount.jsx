import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SubPageHeader from "../components/SubPageHeader";
import "./SubPages.css";

export default function ManageAccount() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await user.delete();
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleting(false);
      /* If Firebase requires re-auth, prompt sign-in again */
      if (err.code === "auth/requires-recent-login") {
        alert("For security, please log out and sign in again before deleting your account.");
      }
    }
  };

  return (
    <div className="sp-page">
      <SubPageHeader title="Manage Account" />

      <div className="sp-body">
        <div className="sp-empty-icon sp-empty-icon--warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <p className="sp-empty-title">Danger Zone</p>
        <p className="sp-empty-sub">
          Deleting your account is permanent and cannot be undone. All your order history and saved items will be lost.
        </p>

        <button
          className="sp-danger-btn"
          onClick={() => setShowConfirm(true)}
        >
          Delete My Account
        </button>
      </div>

      {/* Confirm Sheet */}
      {showConfirm && (
        <div className="sp-sheet-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="sp-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sp-sheet__bar" />
            <p className="sp-sheet__title">Are you sure?</p>
            <p className="sp-sheet__sub">
              This will permanently delete your account. This action cannot be reversed.
            </p>
            <button
              className="sp-sheet__danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, Delete My Account"}
            </button>
            <button
              className="sp-sheet__cancel"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
