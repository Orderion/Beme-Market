/* Media section — wraps existing MediaManager */
import MediaManager from "../../admin/MediaManager";
export default function MediaSection() {
  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Media Manager</div>
        <div className="ap-page-sub">Cloudinary media library — images and videos</div>
      </div>
      <MediaManager/>
    </div>
  );
}
