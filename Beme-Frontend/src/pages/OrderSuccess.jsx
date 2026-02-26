import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { verifyPaystack } from "../services/api";

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference");
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!reference) return;

    (async () => {
      try {
        const res = await verifyPaystack(reference);
        setStatus(res.isSuccess ? "paid" : "failed");
      } catch {
        setStatus("failed");
      }
    })();
  }, [reference]);

  return (
    <div className="page">
      {status === "verifying" && <p>Verifying payment…</p>}
      {status === "paid" && <p>Payment successful ✅</p>}
      {status === "failed" && <p>Payment not confirmed ❌</p>}
    </div>
  );
}