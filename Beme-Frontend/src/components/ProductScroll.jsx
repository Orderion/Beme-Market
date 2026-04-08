export default function ProductScroll() {
  return (
    <section className="section">
      <div className="section-header">
        <h3>Continue shopping</h3>
        <span className="see-all">See all</span>
      </div>

      <div className="product-scroll">
        <div className="product-card">
          <span className="badge">Bestseller</span>
          <img
            src="https://via.placeholder.com/300x350"
            alt="Juventus Home Jersey"
          />
          <p className="product-name">
            Juventus Home Jersey 2025/26
          </p>
        </div>

        <div className="product-card">
          <img
            src="https://via.placeholder.com/300x350"
            alt="Away Jersey"
          />
          <p className="product-name">Away Jersey</p>
        </div>
      </div>
    </section>
  );
}
