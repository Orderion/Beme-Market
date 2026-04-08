export default function Hero() {
  return (
    <section
      className="
        relative overflow-hidden
        rounded-3xl
        bg-gradient-to-br from-yellow-100 via-red-100 to-green-100
        p-6 sm:p-8
        flex flex-col sm:flex-row
        items-center justify-between
        gap-6
      "
    >
      {/* ===== TEXT CONTENT ===== */}
      <div className="max-w-md">
        <p className="text-sm font-medium text-red-600 mb-2">
          Big Sale
        </p>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight mb-3">
          Wireless Headphones
        </h2>

        <p className="text-gray-700 mb-5">
          Experience premium sound quality with noise
          cancellation and all-day comfort.
        </p>

        <button className="
          px-6 py-3
          rounded-xl
          bg-black text-white
          text-sm font-medium
          hover:bg-gray-800
          transition
        ">
          Shop now
        </button>
      </div>

      {/* ===== IMAGE ===== */}
      <div className="flex-shrink-0">
        <img
          src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
          alt="Wireless Headphones"
          className="
            w-40 sm:w-52 lg:w-64
            object-contain
            drop-shadow-lg
          "
        />
      </div>
    </section>
  )
}
