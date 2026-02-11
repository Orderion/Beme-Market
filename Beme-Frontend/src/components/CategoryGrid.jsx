const categories = [
  "Household goods",
  "Game controllers",
  "Accessories",
  "Furniture",
]

const CategoryGrid = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Explore popular categories</h3>
        <button className="text-sm text-gray-400 hover:text-black">
          See all →
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {categories.map((item) => (
          <div
            key={item}
            className="bg-white rounded-3xl p-8 text-center hover:shadow-md transition"
          >
            <div className="text-5xl mb-4">🛍️</div>
            <p className="font-medium">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoryGrid
