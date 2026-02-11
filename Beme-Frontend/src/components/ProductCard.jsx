import { useCart } from "../context/CartContext"

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()

  return (
    <div className="bg-white rounded-3xl p-4 hover:shadow-md transition">
      <div className="relative bg-gray-100 rounded-2xl h-40 flex items-center justify-center mb-4">
        🖼️
        {product.discount && (
          <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            -{product.discount}%
          </span>
        )}
      </div>

      <h4 className="font-medium mb-1">{product.name}</h4>

      <div className="flex justify-between mb-3">
        <span className="font-semibold">${product.price}</span>
        <span className="text-sm text-gray-400">⭐ {product.rating}</span>
      </div>

      <button
        onClick={() => addToCart(product)}
        className="w-full bg-black text-white py-2 rounded-full text-sm hover:bg-gray-800 transition"
      >
        Add to cart
      </button>
    </div>
  )
}

export default ProductCard
