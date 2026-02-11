import { useCart } from "../context/CartContext"

const CartDrawer = ({ isOpen, onClose }) => {
  const { cart = [], removeFromCart } = useCart()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">
            Your Cart ({cart.length})
          </h2>
          <button onClick={onClose} className="text-xl">
            ✕
          </button>
        </div>

        {/* Cart Items */}
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Your cart is empty
          </div>
        ) : (
          <ul className="flex-1 space-y-4 overflow-y-auto">
            {cart.map((item, index) => (
              <li
                key={index}
                className="flex justify-between items-center border-b pb-3"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-400">
                    ${item.price}
                  </p>
                </div>

                {/* ✅ Remove button */}
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <button className="mt-6 w-full bg-black text-white py-3 rounded-full">
          Checkout
        </button>
      </div>
    </div>
  )
}

export default CartDrawer
