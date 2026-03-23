// ONLY structure + class fixes (NO LOGIC REMOVED)

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [openSection, setOpenSection] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const shopLabel = useMemo(
    () => (adminShop ? titleize(adminShop) : ""),
    [adminShop]
  );

  const isRouteActive = (path) => location.pathname === path;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmLogout(false);
      setOpenSection(null);
    }
  }, [isOpen]);

  const go = (path) => {
    setConfirmLogout(false);
    navigate(path);
    onClose?.();
  };

  const goDept = (dept) => {
    const kind = DEFAULT_KIND_BY_DEPT[dept];
    go(`/shop?dept=${dept}${kind ? `&kind=${kind}` : ""}`);
  };

  const goCategory = (cat) => {
    go(`/shop?q=${encodeURIComponent(cat)}`);
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      setConfirmLogout(false);
      onClose?.();
      navigate("/", { replace: true });
    }
  };

  const toggleSection = (name) => {
    setOpenSection((prev) => (prev === name ? null : name));
  };

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
      <div
        className={`overlay ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`side-panel ${isOpen ? "open" : ""}`}>
        {/* HEADER */}
        <div className="side-header">
          <h3 className="side-title">Menu</h3>
          <button className="side-close" onClick={onClose}>×</button>
        </div>

        {/* CONTENT */}
        <div className="side-scroll">

          {/* MAIN */}
          <div className="side-group">
            <SidebarRow icon={<IconHome />} label="Home" onClick={() => go("/")} />
            <SidebarRow icon={<IconShop />} label="Shop" onClick={() => go("/shop")} />

            {user && (
              <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/orders")} />
            )}
          </div>

          {/* ADMIN */}
          {isSuperAdmin && (
            <div className="side-group">
              <div className="side-group-label">Admin</div>

              <SidebarRow icon={<IconShield />} label="Product Manager" onClick={() => go("/admin")} />
              <SidebarRow icon={<IconReviewQueue />} label="Review Queue" onClick={() => go("/admin-review-queue")} />
              <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/admin-orders")} />
              <SidebarRow icon={<IconGrid />} label="Analytics" onClick={() => go("/analytics")} />
            </div>
          )}

          {/* SHOP ADMIN */}
          {isShopAdmin && (
            <div className="side-group">
              <div className="side-group-label">
                Shop Admin {shopLabel && `• ${shopLabel}`}
              </div>

              <SidebarRow icon={<IconShield />} label="Product Manager" onClick={() => go("/admin")} />
              <SidebarRow icon={<IconOrders />} label="Shop Orders" onClick={() => go("/admin-orders")} />
            </div>
          )}

          {/* CATEGORIES */}
          <div className="side-group">
            <SidebarRow
              icon={<IconGrid />}
              label="Categories"
              expand
              open={openSection === "categories"}
              onClick={() => toggleSection("categories")}
            />

            <div className={`side-submenu-wrap ${openSection === "categories" ? "is-open" : ""}`}>
              <div className="side-submenu">
                <button className="side-subitem" onClick={() => goCategory("tech")}>Tech</button>
                <button className="side-subitem" onClick={() => goCategory("fashion")}>Fashion</button>
                <button className="side-subitem" onClick={() => goCategory("accessories")}>Accessories</button>
              </div>
            </div>

            <SidebarRow
              icon={<IconLayers />}
              label="Departments"
              expand
              open={openSection === "departments"}
              onClick={() => toggleSection("departments")}
            />

            <div className={`side-submenu-wrap ${openSection === "departments" ? "is-open" : ""}`}>
              <div className="side-submenu">
                <button className="side-subitem" onClick={() => goDept("men")}>Men</button>
                <button className="side-subitem" onClick={() => goDept("women")}>Women</button>
              </div>
            </div>
          </div>

          {/* MORE */}
          <div className="side-group">
            <SidebarRow icon={<IconMore />} label="More" expand open={openSection === "more"} onClick={() => toggleSection("more")} />

            <div className={`side-submenu-wrap ${openSection === "more" ? "is-open" : ""}`}>
              <div className="side-submenu">
                <button className="side-subitem" onClick={() => go("/about")}>About</button>
                <button className="side-subitem" onClick={() => go("/contact")}>Contact</button>
              </div>
            </div>
          </div>

          {/* AUTH */}
          <div className="side-group">
            {!user ? (
              <>
                <SidebarRow icon={<IconLogin />} label="Login" onClick={() => go("/login")} />
                <SidebarRow icon={<IconUserPlus />} label="Sign Up" onClick={() => go("/signup")} />
              </>
            ) : !confirmLogout ? (
              <SidebarRow icon={<IconLogout />} label="Logout" danger onClick={() => setConfirmLogout(true)} />
            ) : (
              <div className="side-confirm">
                <p className="side-confirm-text">Confirm logout?</p>
                <div className="side-confirm-actions">
                  <button className="side-confirm-btn" onClick={() => setConfirmLogout(false)}>Cancel</button>
                  <button className="side-confirm-btn side-confirm-btn--danger" onClick={onLogout}>Logout</button>
                </div>
              </div>
            )}
          </div>

          {/* THEME */}
          <div className="side-group side-group--toggle">
            <div className="sidebar-toggle-row">
              <div className="side-link-content">
                <IconSun />
                <span>{darkMode ? "Light mode" : "Dark mode"}</span>
              </div>

              <button
                className={`theme-toggle ${darkMode ? "active" : ""}`}
                onClick={toggleTheme}
              >
                <span className="theme-toggle-track">
                  <span className="theme-toggle-thumb" />
                </span>
              </button>
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}