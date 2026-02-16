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

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!image) return;

    const imageRef = ref(storage, `products/${image.name}`);
    await uploadBytes(imageRef, image);
    const imageUrl = await getDownloadURL(imageRef);

    await addDoc(collection(db, "products"), {
      name,
      price,
      oldPrice,
      image: imageUrl,
      createdAt: new Date()
    });

    alert("Product uploaded!");
    setName("");
    setPrice("");
    setOldPrice("");
  };

  return (
    <div className="admin">
      <h2>Upload Product</h2>
      <form onSubmit={handleUpload}>
        <input placeholder="Product Name" onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Price" onChange={(e) => setPrice(e.target.value)} required />
        <input placeholder="Old Price (optional)" onChange={(e) => setOldPrice(e.target.value)} />
        <input type="file" onChange={(e) => setImage(e.target.files[0])} required />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
}
