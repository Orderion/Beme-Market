const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_FILE_SIZE_MB    = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES       = ["image/jpeg", "image/png", "image/webp"];

function ensureEnv() {
  if (!CLOUD_NAME)    throw new Error("Missing VITE_CLOUDINARY_CLOUD_NAME in .env");
  if (!UPLOAD_PRESET) throw new Error("Missing VITE_CLOUDINARY_UPLOAD_PRESET in .env");
}

export function validateImageFile(file) {
  if (!file) throw new Error("Please choose an image.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPG, PNG and WEBP images are allowed.");
  if (file.size > MAX_FILE_SIZE_BYTES)    throw new Error("Image must be under 5MB.");
  return true;
}

export function validateImageFiles(files) {
  if (!Array.isArray(files) || files.length === 0)
    throw new Error("Please choose at least one image.");
  files.forEach(validateImageFile);
  return true;
}

/**
 * Upload a single image to Cloudinary.
 * @param {File}   file    - The file to upload
 * @param {string} folder  - Optional Cloudinary folder path
 * @returns {Promise<{ url, publicId, width, height, format, bytes, originalFilename }>}
 */
export async function uploadImageToCloudinary(file, folder = "") {
  ensureEnv();
  validateImageFile(file);

  const formData = new FormData();
  formData.append("file",          file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return {
    url:              data.secure_url,
    publicId:         data.public_id,
    width:            data.width,
    height:           data.height,
    format:           data.format,
    bytes:            data.bytes,
    originalFilename: data.original_filename,
  };
}

/**
 * Upload multiple images to Cloudinary.
 * @param {File[]} files  - Array of files
 * @param {string} folder - Optional Cloudinary folder path
 */
export async function uploadImagesToCloudinary(files, folder = "") {
  ensureEnv();
  validateImageFiles(files);

  const uploaded = [];
  for (const file of files) {
    const result = await uploadImageToCloudinary(file, folder);
    uploaded.push(result);
  }
  return uploaded;
}

/**
 * Add Cloudinary transformation parameters to an existing URL.
 * Returns the URL unchanged if it's not a Cloudinary URL.
 */
export function getOptimizedUrl(
  url,
  { width = "auto", quality = "auto", format = "auto" } = {}
) {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_${quality},f_${format}/`);
}