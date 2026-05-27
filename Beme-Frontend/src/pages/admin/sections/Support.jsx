/* Support section — wraps existing AdminSupportDashboard inside new shell */
import AdminSupportDashboard from "../../admin/AdminSupportDashboard";
export default function SupportSection() {
  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Support Inbox</div>
        <div className="ap-page-sub">Manage customer support tickets</div>
      </div>
      <AdminSupportDashboard embedded />
    </div>
  );
}
