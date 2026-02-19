import { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./Admin.css";

export default function Admin() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!image) {
      alert("Please select an image.");
      return;
    }

    // Validate prices
    if (isNaN(price) || (oldPrice && isNaN(oldPrice))) {
      alert("Price fields must be numbers.");
      return;
    }

    try {
      setLoading(true);

      // Upload image to Firebase Storage
      const imageRef = ref(storage, `products/${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // Add product to Firestore
      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        oldPrice: oldPrice ? Number(oldPrice) : null,
        image: imageUrl,
        createdAt: new Date()
      });

      alert("Product uploaded successfully!");

      // Reset form
      setName("");
      setPrice("");
      setOldPrice("");
      setImage(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload product. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin">
      <h2>Upload Product</h2>
      <form onSubmit={handleUpload} className="admin-form">
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Old Price (optional)"
          value={oldPrice}
          onChange={(e) => setOldPrice(e.target.value)}
        />

        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
