import ProductCard from "./ProductCard"

const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 120,
    rating: 4.8,
    discount: 20,
  },
  {
    id: 2,
    name: "Smart Watch",
    price: 90,
    rating: 4.5,
  },
  {
    id: 3,
    name: "Gaming Controller",
    price: 60,
    rating: 4.6,
    discount: 10,
  },
  {
    id: 4,
    name: "Bluetooth Speaker",
    price: 75,
    rating: 4.7,
  },
]

const ProductGrid = () => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">
          Popular products
        </h3>
        <button className="text-sm text-gray-400 hover:text-black">
          See all →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default ProductGrid
