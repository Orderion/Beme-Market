export default function Navbar({ onMenuClick }) {
  return (
    <header className="navbar">
      <button className="menu-btn" onClick={onMenuClick}>
        ☰
      </button>

      <div className="search-box">
        <input type="text" placeholder="Search products" />
      </div>
    </header>
  );
}
