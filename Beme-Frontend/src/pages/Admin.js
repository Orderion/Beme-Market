import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const Admin = () => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    image: "",
  });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    await addDoc(collection(db, "products"), {
      ...form,
      price: Number(form.price),
      createdAt: new Date(),
    });

    alert("Product Added");
  };

  return (
    <div>
      <h2>Add Product</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Product Name" onChange={handleChange} />
        <input name="price" placeholder="Price" onChange={handleChange} />
        <input name="image" placeholder="Image URL" onChange={handleChange} />
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
};
if (prompt("Enter admin password") !== "beme2026") {
  return <h2>Access Denied</h2>;
}
export default Admin;