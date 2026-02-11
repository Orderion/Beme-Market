import React from "react";

const categories = [
  { id: 1, name: "Electronics", icon: "💻" },
  { id: 2, name: "Fashion", icon: "👗" },
  { id: 3, name: "Home & Living", icon: "🏠" },
  { id: 4, name: "Beauty", icon: "💄" },
  { id: 5, name: "Sports", icon: "🏀" },
  { id: 6, name: "Toys", icon: "🧸" },
  { id: 7, name: "Books", icon: "📚" },
  { id: 8, name: "Groceries", icon: "🛒" },
];

const PopularCategories = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Categories</h2>
      
      {/* Mobile: horizontal scroll */}
      <div className="flex space-x-4 overflow-x-auto sm:hidden pb-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex-shrink-0 w-32 h-32 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center justify-center text-center cursor-pointer"
          >
            <span className="text-4xl mb-2">{category.icon}</span>
            <span className="text-gray-800 font-medium">{category.name}</span>
          </div>
        ))}
      </div>

      {/* Tablet & Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center justify-center py-8 cursor-pointer"
          >
            <span className="text-5xl mb-4">{category.icon}</span>
            <span className="text-gray-800 font-semibold text-lg">{category.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PopularCategories;
