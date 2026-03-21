function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateOrderSubtotal(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const price = toNumber(item?.price, 0);
    const qty = Math.max(1, toNumber(item?.qty, 1));
    return sum + price * qty;
  }, 0);
}

export function calculateSupplierItemsCostTotal(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const supplierCost = Math.max(0, toNumber(item?.supplierCost, 0));
    const qty = Math.max(1, toNumber(item?.qty, 1));
    return sum + supplierCost * qty;
  }, 0);
}

export function calculateSupplierShippingTotal(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const shippingEstimate = Math.max(
      0,
      toNumber(
        item?.supplierShippingEstimate ??
          item?.abroadDeliveryFee ??
          0,
        0
      )
    );
    const qty = Math.max(1, toNumber(item?.qty, 1));
    return sum + shippingEstimate * qty;
  }, 0);
}

export function calculateAbroadDeliveryTotal(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const fee = Math.max(0, toNumber(item?.abroadDeliveryFee, 0));
    const qty = Math.max(1, toNumber(item?.qty, 1));
    return sum + fee * qty;
  }, 0);
}

export function calculateExpectedProfit({
  items = [],
  pricing = {},
} = {}) {
  const total = Math.max(0, toNumber(pricing?.total, 0));
  const supplierItemsCostTotal = calculateSupplierItemsCostTotal(items);
  const supplierShippingTotal = calculateSupplierShippingTotal(items);
  const expectedProfit = total - supplierItemsCostTotal - supplierShippingTotal;

  return {
    supplierItemsCostTotal,
    supplierShippingTotal,
    expectedProfit,
    expectedProfitMargin:
      total > 0 ? Number(((expectedProfit / total) * 100).toFixed(2)) : 0,
  };
}

export function buildReviewPricing(pricing = {}, items = []) {
  const subtotal = Math.max(
    0,
    toNumber(pricing?.subtotal, calculateOrderSubtotal(items))
  );
  const deliveryFee = Math.max(0, toNumber(pricing?.deliveryFee, 0));
  const total = Math.max(0, toNumber(pricing?.total, subtotal + deliveryFee));
  const currency = String(pricing?.currency || "GHS").trim() || "GHS";

  const {
    supplierItemsCostTotal,
    supplierShippingTotal,
    expectedProfit,
    expectedProfitMargin,
  } = calculateExpectedProfit({
    items,
    pricing: { subtotal, deliveryFee, total, currency },
  });

  return {
    subtotal,
    deliveryFee,
    total,
    currency,
    supplierItemsCostTotal,
    supplierShippingTotal,
    expectedProfit,
    expectedProfitMargin,
  };
}

export function summarizeStockState(items = []) {
  const rows = Array.isArray(items) ? items : [];

  const outOfStockCount = rows.filter(
    (item) => item?.inStock === false || (Number(item?.stock) <= 0 && Number.isFinite(Number(item?.stock)))
  ).length;

  const quantityMismatchCount = rows.filter((item) => {
    const stock = Number(item?.stock);
    const qty = Number(item?.qty || 0);
    return Number.isFinite(stock) && stock >= 0 && qty > stock;
  }).length;

  return {
    checked: rows.length,
    outOfStockCount,
    quantityMismatchCount,
    ok: outOfStockCount === 0 && quantityMismatchCount === 0,
  };
}

export function summarizeReviewFlags(order = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const flags = [];

  if (!order?.customer?.phone) flags.push("missing_phone");
  if (!order?.customer?.address) flags.push("missing_address");
  if (!order?.customer?.city || !order?.customer?.region) {
    flags.push("incomplete_location");
  }

  if (items.some((item) => item?.shipsFromAbroad === true)) {
    flags.push("ships_from_abroad");
  }

  if (items.some((item) => item?.inStock === false)) {
    flags.push("stock_flag");
  }

  if (
    items.some((item) => {
      const stock = Number(item?.stock);
      const qty = Number(item?.qty || 0);
      return Number.isFinite(stock) && qty > stock;
    })
  ) {
    flags.push("quantity_exceeds_stock");
  }

  const total = Math.max(0, toNumber(order?.pricing?.total, 0));
  if (total >= 5000) {
    flags.push("high_value_order");
  }

  return Array.from(new Set(flags));
}