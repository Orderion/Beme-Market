import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { paystackVerify } from "../services/api";

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const reference = params.get("reference");

  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!reference) {
      setStatus("paid"); // COD flow might land here without reference
      return;
    }

    (async () => {
      try {
        const res = await paystackVerify(reference);
        // axios response -> res.data
        const ok = !!res?.data?.isSuccess;
        setStatus(ok ? "paid" : "failed");
      } catch (e) {
        console.error(e);
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