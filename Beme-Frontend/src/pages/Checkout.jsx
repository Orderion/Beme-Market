import React from "react";
import { useCart } from "../context/CartContext";

const Checkout = () => {
  const { cart } = useCart();

  const grandTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Shipping / Billing Form */}
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4">Shipping & Billing</h2>
          <form className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              className="border p-2 rounded w-full"
            />
            <input
              type="email"
              placeholder="Email"
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="Address"
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="City"
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="Postal Code"
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="Country"
              className="border p-2 rounded w-full"
            />
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${grandTotal}</span>
              </div>
            </div>
          )}

          <button
            disabled={cart.length === 0}
            className="mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
