function safe(value, fallback = "") {
  return value ?? fallback;
}

export function formatCustomerForSupplier(customer = {}) {
  return {
    firstName: safe(customer.firstName),
    lastName: safe(customer.lastName),
    fullName: `${safe(customer.firstName)} ${safe(customer.lastName)}`.trim(),
    email: safe(customer.email),
    phone: safe(customer.phone),
    address: safe(customer.address),
    city: safe(customer.city),
    region: safe(customer.region),
    country: safe(customer.country || "Ghana"),
    notes: safe(customer.notes),
  };
}

export function formatItemsForSupplier(items = []) {
  return items.map((item) => ({
    productId: item.productId || item.id,
    name: item.name,
    quantity: item.qty || 1,
    price: item.price,
    basePrice: item.basePrice,
    optionPriceTotal: item.optionPriceTotal || 0,
    selectedOptions: item.selectedOptions || {},
    selectedOptionDetails: item.selectedOptionDetails || [],
    customizations: item.customizations || [],
    shipsFromAbroad: item.shipsFromAbroad === true,
  }));
}

export function formatOrderForSupplier(order) {
  if (!order) return null;

  return {
    orderId: order.id,
    reference: order.reference || "",
    createdAt: order.createdAt || null,

    customer: formatCustomerForSupplier(order.customer),

    items: formatItemsForSupplier(order.items),

    pricing: {
      subtotal: order?.pricing?.subtotal || 0,
      deliveryFee: order?.pricing?.deliveryFee || 0,
      total: order?.pricing?.total || 0,
      currency: order?.pricing?.currency || "GHS",
    },

    metadata: {
      shop: order.primaryShop || "main",
      notes: order?.adminNotes || "",
    },
  };
}

export function buildSupplierPayload(order, supplier = "cj") {
  const base = formatOrderForSupplier(order);

  return {
    supplier,
    payload: base,
  };
}

export function extractSupplierSummary(order) {
  if (!order) return null;

  const totalItems =
    (order.items || []).reduce((sum, i) => sum + (i.qty || 1), 0) || 0;

  const abroadItems = (order.items || []).filter(
    (i) => i.shipsFromAbroad === true
  ).length;

  return {
    totalItems,
    abroadItems,
    totalAmount: order?.pricing?.total || 0,
  };
}