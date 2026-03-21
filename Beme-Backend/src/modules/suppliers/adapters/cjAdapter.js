import BaseAdapter from "./baseAdapter.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

export default class CJAdapter extends BaseAdapter {
  constructor() {
    super();
    this.key = "cj";
    this.label = "CJ Dropshipping Adapter";

    this.apiKey = process.env.CJ_API_KEY || "";
    this.baseUrl = process.env.CJ_API_BASE_URL || "";
  }

  validateOrder(order = {}) {
    super.validateOrder(order);

    if (!this.apiKey || !this.baseUrl) {
      const error = new Error(
        "CJ API credentials are not configured in environment variables."
      );
      error.statusCode = 500;
      throw error;
    }

    return true;
  }

  buildOrderPayload(order = {}) {
    const base = super.buildOrderPayload(order);

    return {
      platformOrderId: base.orderId,
      shippingAddress: {
        name: `${base.customer.firstName} ${base.customer.lastName}`.trim(),
        address: base.customer.address,
        city: base.customer.city,
        state: base.customer.region,
        country: base.customer.country || "Ghana",
        phone: base.customer.phone,
      },
      products: base.items.map((item) => ({
        productId: item.supplierProductId || item.productId,
        variantId: item.supplierVariantId || "",
        quantity: item.qty,
      })),
      remark: base.customer.notes || "",
    };
  }

  summarizePayload(payload = {}) {
    return {
      platformOrderId: payload?.platformOrderId || "",
      productCount: Array.isArray(payload?.products)
        ? payload.products.length
        : 0,
      destination: payload?.shippingAddress?.country || "",
    };
  }

  async createSupplierOrder(order = {}) {
    this.validateOrder(order);

    const payload = this.buildOrderPayload(order);

    try {
      const res = await fetch(`${this.baseUrl}/order/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.result) {
        const error = new Error(
          data?.message || "CJ order creation failed."
        );
        error.statusCode = res.status || 500;
        error.meta = data;
        throw error;
      }

      return {
        ok: true,
        supplier: "cj",
        supplierOrderId: safeTrim(data?.data?.orderId),
        supplierStatus: "submitted",
        raw: data,
      };
    } catch (err) {
      const error = new Error(
        err?.message || "CJ API request failed."
      );
      error.statusCode = err?.statusCode || 500;
      error.meta = err?.meta || null;
      throw error;
    }
  }

  async getSupplierOrderStatus(order = {}) {
    if (!order?.supplierOrderId) {
      const error = new Error("Missing supplierOrderId for CJ status check.");
      error.statusCode = 400;
      throw error;
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/order/query?orderId=${encodeURIComponent(
          order.supplierOrderId
        )}`,
        {
          headers: {
            "CJ-Access-Token": this.apiKey,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.result) {
        throw new Error(data?.message || "CJ status fetch failed.");
      }

      return {
        ok: true,
        supplier: "cj",
        supplierOrderId: order.supplierOrderId,
        supplierStatus: safeTrim(data?.data?.status || "unknown"),
        raw: data,
      };
    } catch (err) {
      const error = new Error(
        err?.message || "CJ status request failed."
      );
      error.statusCode = 500;
      throw error;
    }
  }
}