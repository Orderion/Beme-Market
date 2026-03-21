import BaseAdapter from "./baseAdapter.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

export default class DSersAdapter extends BaseAdapter {
  constructor() {
    super();
    this.key = "dsers";
    this.label = "DSers / AliExpress Adapter";

    this.apiKey = process.env.DSERS_API_KEY || "";
    this.baseUrl = process.env.DSERS_API_BASE_URL || "";
  }

  validateOrder(order = {}) {
    super.validateOrder(order);

    if (!this.apiKey || !this.baseUrl) {
      const error = new Error(
        "DSers API credentials are not configured in environment variables."
      );
      error.statusCode = 500;
      throw error;
    }

    return true;
  }

  buildOrderPayload(order = {}) {
    const base = super.buildOrderPayload(order);

    return {
      externalOrderId: base.orderId,
      customer: {
        firstName: base.customer.firstName,
        lastName: base.customer.lastName,
        email: base.customer.email,
        phone: base.customer.phone,
      },
      shippingAddress: {
        address1: base.customer.address,
        city: base.customer.city,
        state: base.customer.region,
        country: base.customer.country || "Ghana",
      },
      items: base.items.map((item) => ({
        productId: item.supplierProductId || item.productId,
        sku: item.supplierSku || "",
        variantId: item.supplierVariantId || "",
        quantity: item.qty,
      })),
      note: base.customer.notes || "",
    };
  }

  summarizePayload(payload = {}) {
    return {
      externalOrderId: payload?.externalOrderId || "",
      itemCount: Array.isArray(payload?.items) ? payload.items.length : 0,
      destination: payload?.shippingAddress?.country || "",
    };
  }

  async createSupplierOrder(order = {}) {
    this.validateOrder(order);

    const payload = this.buildOrderPayload(order);

    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        const error = new Error(
          data?.message || "DSers order creation failed."
        );
        error.statusCode = res.status || 500;
        error.meta = data;
        throw error;
      }

      return {
        ok: true,
        supplier: "dsers",
        supplierOrderId: safeTrim(
          data?.data?.orderId || data?.orderId || data?.id
        ),
        supplierStatus: safeTrim(
          data?.data?.status || data?.status || "submitted"
        ),
        raw: data,
      };
    } catch (err) {
      const error = new Error(err?.message || "DSers API request failed.");
      error.statusCode = err?.statusCode || 500;
      error.meta = err?.meta || null;
      throw error;
    }
  }

  async getSupplierOrderStatus(order = {}) {
    if (!order?.supplierOrderId) {
      const error = new Error("Missing supplierOrderId for DSers status check.");
      error.statusCode = 400;
      throw error;
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/orders/${encodeURIComponent(order.supplierOrderId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "DSers status fetch failed.");
      }

      return {
        ok: true,
        supplier: "dsers",
        supplierOrderId: order.supplierOrderId,
        supplierStatus: safeTrim(
          data?.data?.status || data?.status || "unknown"
        ),
        raw: data,
      };
    } catch (err) {
      const error = new Error(err?.message || "DSers status request failed.");
      error.statusCode = 500;
      throw error;
    }
  }
}