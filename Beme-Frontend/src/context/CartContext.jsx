import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "beme_market_cart";

function normalizeSelectedOptions(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== "object") return {};

  return Object.keys(selectedOptions)
    .sort()
    .reduce((acc, key) => {
      const value = selectedOptions[key];
      acc[key] = typeof value === "string" ? value.trim() : value;
      return acc;
    }, {});
}

function makeLineId(product) {
  const baseId = String(product?.id || "").trim();
  const selectedOptions = normalizeSelectedOptions(product?.selectedOptions);
  return `${baseId}__${JSON.stringify(selectedOptions)}`;
}

function normalizeCartItem(product) {
  const safeSelectedOptions = normalizeSelectedOptions(product?.selectedOptions);

  const images = Array.isArray(product?.images)
    ? product.images.map((img) => String(img || "").trim()).filter(Boolean)
    : [];

  const image = String(product?.image || images[0] || "").trim();

  const qty = Math.max(1, Number(product?.qty) || 1);
  const price = Number(product?.price) || 0;

  const normalized = {
    id: String(product?.id || "").trim(),
    lineId: String(product?.lineId || makeLineId(product)).trim(),
    name: String(product?.name || "Untitled").trim(),
    price,
    image,
    images: images.length ? images : image ? [image] : [],
    qty,
    selectedOptions: safeSelectedOptions,
    selectedOptionsLabel: String(product?.selectedOptionsLabel || "").trim(),
    customizations: Array.isArray(product?.customizations)
      ? product.customizations
      : [],
  };

  if (!normalized.selectedOptionsLabel) {
    normalized.selectedOptionsLabel = Object.entries(safeSelectedOptions)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" • ");
  }

  return normalized;
}

function safeReadStoredCart() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeCartItem(item))
      .filter((item) => item.id && item.lineId);
  } catch (error) {
    console.error("Failed to read cart from localStorage:", error);
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => safeReadStoredCart());

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cartItems]);

  const addToCart = (product) => {
    const nextItem = normalizeCartItem(product);
    const lineId = nextItem.lineId;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.lineId === lineId);

      if (existing) {
        return prev.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                qty: Math.max(
                  1,
                  Number(item.qty || 1) + Number(nextItem.qty || 1)
                ),
              }
            : item
        );
      }

      return [...prev, nextItem];
    });
  };

  const removeFromCart = (lineId) => {
    setCartItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const updateQty = (lineId, qty) => {
    const safeQty = Math.max(1, Number(qty) || 1);

    setCartItems((prev) =>
      prev.map((item) =>
        item.lineId === lineId ? { ...item, qty: safeQty } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    subtotal,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};