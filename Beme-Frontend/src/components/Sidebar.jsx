const categories = [
  "New Arrivals",
  "Men",
  "Women",
  "Kids",
  "Jerseys",
  "Training",
  "Accessories",
];

export default function Sidebar({ isOpen, onClose, type = "sidebar" }) {
  /* DROPDOWN MODE */
  if (type === "dropdown") {
    return (
      <div className="category-dropdown">
        {categories.map((cat) => (
          <button key={cat} className="dropdown-item">
            {cat}
          </button>
        ))}
      </div>
    );
  }

  /* SIDEBAR MODE */
  return (
    <>
      {isOpen && <div className="overlay" onClick={onClose} />}

      <aside className={`side-panel ${isOpen ? "open" : ""}`}>
        <div className="side-header">
          <h3>Menu</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="side-links">
          {categories.map((cat) => (
            <button key={cat} className="sidebar-link">
              {cat}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
