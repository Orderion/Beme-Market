// ─────────────────────────────────────────────────────────────
//  utils/cloudinaryUpload.js  ·  Beme Market
//
//  Credentials are pulled from .env — set these in your .env file:
//    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//    VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
// ─────────────────────────────────────────────────────────────

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file to Cloudinary.
 * @param {File}     file        - The file to upload
 * @param {Function} onProgress  - (percent: number) => void  (optional)
 * @param {string}   folder      - Cloudinary folder path (optional)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export function uploadToCloudinary(
  file,
  onProgress = null,
  folder = "beme_market/homepage"
) {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary credentials missing — check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file."));
      return;
    }

    const formData = new FormData();
    formData.append("file",          file);
    formData.append("upload_preset", UPLOAD_PRESET);   // ← fixed: was CLOUDINARY_UPLOAD_PRESET
    formData.append("folder",        folder);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`  // ← fixed: was CLOUDINARY_CLOUD_NAME
    );

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err?.error?.message || msg;
        } catch (_) {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(formData);
  });
}

/**
 * Add Cloudinary transformation parameters to an existing URL.
 * Works only on cloudinary.com URLs — returns the URL unchanged otherwise.
 * @param {string} url
 * @param {{ width?: string|number, quality?: string, format?: string }} options
 */
export function getOptimizedUrl(
  url,
  { width = "auto", quality = "auto", format = "auto" } = {}
) {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_${quality},f_${format}/`);
}