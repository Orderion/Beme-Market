/* Products section — wraps the existing Admin.jsx product manager inside the new shell */
import Admin from "../../Admin";
export default function ProductsSection() {
  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Products</div>
        <div className="ap-page-sub">Manage all products, add new, CSV import, flash deals</div>
      </div>
      <Admin />
    </div>
  );
}
