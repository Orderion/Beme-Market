import logo from "../assets/logo.png";

export default function Navbar({ onMenuClick }) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <button className="menu-btn" onClick={onMenuClick}>
          ☰
        </button>

        <img src={logo} alt="Beme Market" className="nav-logo" />
      </div>

      <div className="search-box">
        <input type="text" placeholder="Search products" />
      </div>
    </header>
  );
}