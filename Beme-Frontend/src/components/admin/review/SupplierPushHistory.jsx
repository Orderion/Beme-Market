import "./SupplierPushHistory.css";

function formatDate(value) {
  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : new Date(value);

    return date.toLocaleString("en-GH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function SupplierPushHistory({ history = [] }) {
  return (
    <div className="supplier-history">
      <div className="supplier-history__head">
        <h3>Supplier Push History</h3>
      </div>

      {!history.length ? (
        <div className="supplier-history__empty">
          No supplier push attempts yet.
        </div>
      ) : (
        <div className="supplier-history__list">
          {history.map((entry, index) => (
            <div key={index} className="supplier-history__item">
              <div className="supplier-history__top">
                <span className="supplier-history__status">
                  {entry.status || "unknown"}
                </span>
                <span className="supplier-history__time">
                  {formatDate(entry.createdAt)}
                </span>
              </div>

              <div className="supplier-history__body">
                <p>
                  <strong>Supplier:</strong>{" "}
                  {entry.supplier || "Not specified"}
                </p>

                {entry.message ? (
                  <p className="supplier-history__message">
                    {entry.message}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}