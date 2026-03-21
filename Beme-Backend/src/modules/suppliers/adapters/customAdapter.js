import BaseAdapter from "./baseAdapter.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

export default class CustomAdapter extends BaseAdapter {
  constructor() {
    super();
    this.key = "custom";
    this.label = "Custom Supplier Adapter";
  }

  async createSupplierOrder(order = {}) {
    this.validateOrder(order);

    const payload = this.buildOrderPayload(order);

    // 🔒 For now: NO real supplier push (safe mode)
    // You can later replace this with:
    // - WhatsApp automation
    // - Email to supplier
    // - Internal fulfillment dashboard

    console.log("🟡 [CUSTOM SUPPLIER] Order queued:", {
      orderId: payload.orderId,
      items: payload.items.length,
    });

    return {
      ok: true,
      supplier: "custom",
      supplierOrderId: `CUSTOM_${Date.now()}`,
      supplierStatus: "queued",
      raw: {
        message: "Order queued for manual fulfillment.",
      },
    };
  }

  async getSupplierOrderStatus(order = {}) {
    return {
      ok: true,
      supplier: "custom",
      supplierOrderId: order?.supplierOrderId || "",
      supplierStatus: "processing",
      raw: {},
    };
  }
}