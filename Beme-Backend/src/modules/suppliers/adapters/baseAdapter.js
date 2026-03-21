export default class BaseAdapter {
  constructor() {
    this.key = "base";
    this.label = "Base Supplier Adapter";
  }

  getMeta() {
    return {
      key: this.key,
      label: this.label,
    };
  }

  validateOrder(order = {}) {
    const items = Array.isArray(order?.items) ? order.items : [];

    if (!order || typeof order !== "object") {
      const error = new Error("Order is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!order?.id) {
      const error = new Error("Order id is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!items.length) {
      const error = new Error("Order must contain at least one item.");
      error.statusCode = 400;
      throw error;
    }

    return true;
  }

  buildOrderPayload(order = {}) {
    this.validateOrder(order);

    return {
      orderId: order.id,
      reference: order.reference || "",
      customer: {
        firstName: order?.customer?.firstName || "",
        lastName: order?.customer?.lastName || "",
        email: order?.customer?.email || "",
        phone: order?.customer?.phone || "",
        address: order?.customer?.address || "",
        city: order?.customer?.city || "",
        region: order?.customer?.region || "",
        country: order?.customer?.country || "Ghana",
        notes: order?.customer?.notes || "",
      },
      items: (order.items || []).map((item) => ({
        productId: item?.productId || item?.id || "",
        supplierId: item?.supplierId || "",
        supplierProductId: item?.supplierProductId || "",
        supplierSku: item?.supplierSku || "",
        supplierVariantId: item?.supplierVariantId || "",
        name: item?.name || "",
        qty: Number(item?.qty || 1) || 1,
        price: Number(item?.price || 0) || 0,
        supplierCost: Number(item?.supplierCost || 0) || 0,
      })),
      pricing: {
        subtotal: Number(order?.pricing?.subtotal || 0) || 0,
        deliveryFee: Number(order?.pricing?.deliveryFee || 0) || 0,
        total: Number(order?.pricing?.total || 0) || 0,
        currency: order?.pricing?.currency || "GHS",
      },
    };
  }

  summarizePayload(payload = {}) {
    return {
      orderId: payload?.orderId || "",
      itemCount: Array.isArray(payload?.items) ? payload.items.length : 0,
      total: Number(payload?.pricing?.total || 0) || 0,
      currency: payload?.pricing?.currency || "GHS",
    };
  }

  async createSupplierOrder(order = {}) {
    this.validateOrder(order);

    const error = new Error(
      `Supplier adapter "${this.key}" does not implement createSupplierOrder().`
    );
    error.statusCode = 501;
    throw error;
  }

  async getSupplierOrderStatus(_order = {}) {
    const error = new Error(
      `Supplier adapter "${this.key}" does not implement getSupplierOrderStatus().`
    );
    error.statusCode = 501;
    throw error;
  }

  async cancelSupplierOrder(_order = {}) {
    const error = new Error(
      `Supplier adapter "${this.key}" does not implement cancelSupplierOrder().`
    );
    error.statusCode = 501;
    throw error;
  }

  async syncSupplierInventory(_products = []) {
    return {
      ok: true,
      adapter: this.key,
      synced: 0,
      items: [],
      message: "Inventory sync is not implemented for this adapter yet.",
    };
  }

  async syncSupplierPricing(_products = []) {
    return {
      ok: true,
      adapter: this.key,
      synced: 0,
      items: [],
      message: "Pricing sync is not implemented for this adapter yet.",
    };
  }
}