import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "beme_market_cart";
const CART_POPUP_STORAGE_KEY = "beme_market_cart_popup_state";

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

function getNumericStock(product) {
  const parsed = Number(product?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function isOutOfStock(product) {
  if (!product) return true;
  if (product.inStock === false) return true;

  const stock = getNumericStock(product);
  if (stock !== null && stock <= 0) return true;

  return false;
}

function clampQtyToStock(qty, stock) {
  const safeQty = Math.max(1, Number(qty) || 1);

  if (stock === null) return safeQty;
  return Math.max(1, Math.min(safeQty, stock));
}

function normalizeCartItem(product) {
  const safeSelectedOptions = normalizeSelectedOptions(product?.selectedOptions);

  const images = Array.isArray(product?.images)
    ? product.images.map((img) => String(img || "").trim()).filter(Boolean)
    : [];

  const image = String(product?.image || images[0] || "").trim();
  const stock = getNumericStock(product);
  const qty = clampQtyToStock(product?.qty, stock);
  const price = Number(product?.price) || 0;

  const normalized = {
    id: String(product?.id || "").trim(),
    lineId: String(product?.lineId || makeLineId(product)).trim(),
    name: String(product?.name || "Untitled").trim(),
    price,
    image,
    images: images.length ? images : image ? [image] : [],
    qty,
    stock,
    inStock: product?.inStock !== false,
    selectedOptions: safeSelectedOptions,
    selectedOptionsLabel: String(product?.selectedOptionsLabel || "").trim(),
    customizations: Array.isArray(product?.customizations)
      ? product.customizations
      : [],
    shipsFromAbroad: product?.shipsFromAbroad === true,
  };

  if (!normalized.selectedOptionsLabel) {
    normalized.selectedOptionsLabel = Object.entries(safeSelectedOptions)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" • ");
  }

  return normalized;
}

function sanitizeStoredCartItems(items) {
  return items
    .map((item) => normalizeCartItem(item))
    .filter((item) => item.id && item.lineId && !isOutOfStock(item))
    .map((item) => {
      if (item.stock !== null && item.qty > item.stock) {
        return { ...item, qty: item.stock };
      }
      return item;
    })
    .filter((item) => item.qty >= 1);
}

function safeReadStoredCart() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sanitizeStoredCartItems(parsed);
  } catch (error) {
    console.error("Failed to read cart from localStorage:", error);
    return [];
  }
}

function safeReadPopupState() {
  if (typeof window === "undefined") {
    return {
      visible: false,
      item: null,
      hasShownSinceEmpty: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(CART_POPUP_STORAGE_KEY);
    if (!raw) {
      return {
        visible: false,
        item: null,
        hasShownSinceEmpty: false,
      };
    }

    const parsed = JSON.parse(raw);

    return {
      visible: Boolean(parsed?.visible),
      item: parsed?.item ? normalizeCartItem(parsed.item) : null,
      hasShownSinceEmpty: Boolean(parsed?.hasShownSinceEmpty),
    };
  } catch (error) {
    console.error("Failed to read cart popup state from localStorage:", error);
    return {
      visible: false,
      item: null,
      hasShownSinceEmpty: false,
    };
  }
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => safeReadStoredCart());
  const [cartPopup, setCartPopup] = useState(() => safeReadPopupState());
  const autoHideTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(sanitizeStoredCartItems(cartItems))
      );
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        CART_POPUP_STORAGE_KEY,
        JSON.stringify(cartPopup)
      );
    } catch (error) {
      console.error("Failed to save cart popup state to localStorage:", error);
    }
  }, [cartPopup]);

  useEffect(() => {
    setCartItems((prev) => {
      const sanitized = sanitizeStoredCartItems(prev);
      const changed =
        sanitized.length !== prev.length ||
        sanitized.some((item, index) => {
          const prevItem = prev[index];
          return (
            !prevItem ||
            prevItem.lineId !== item.lineId ||
            Number(prevItem.qty) !== Number(item.qty) ||
            Number(prevItem.stock) !== Number(item.stock) ||
            prevItem.inStock !== item.inStock
          );
        });

      return changed ? sanitized : prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        window.clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && cartPopup.hasShownSinceEmpty) {
      setCartPopup((prev) => ({
        ...prev,
        visible: false,
        item: null,
        hasShownSinceEmpty: false,
      }));
    }
  }, [cartItems.length, cartPopup.hasShownSinceEmpty]);

  const hideCartPopup = () => {
    setCartPopup((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const showCartPopup = (item) => {
    if (typeof window !== "undefined" && autoHideTimerRef.current) {
      window.clearTimeout(autoHideTimerRef.current);
    }

    setCartPopup({
      visible: true,
      item,
      hasShownSinceEmpty: true,
    });

    if (typeof window !== "undefined") {
      autoHideTimerRef.current = window.setTimeout(() => {
        setCartPopup((prev) => ({
          ...prev,
          visible: false,
        }));
      }, 4500);
    }
  };

  const addToCart = (product) => {
    const nextItem = normalizeCartItem(product);

    if (!nextItem.id || !nextItem.lineId) {
      return {
        ok: false,
        message: "Invalid product data.",
      };
    }

    if (isOutOfStock(nextItem)) {
      return {
        ok: false,
        message: "This product is out of stock.",
      };
    }

    const lineId = nextItem.lineId;
    let shouldShowFirstAddPopup = false;
    let result = {
      ok: true,
      message: "Added to cart.",
    };

    setCartItems((prev) => {
      const existing = prev.find((item) => item.lineId === lineId);

      if (existing) {
        const stock = getNumericStock(existing);
        const requestedQty =
          Math.max(1, Number(existing.qty || 1)) +
          Math.max(1, Number(nextItem.qty || 1));

        if (stock !== null && requestedQty > stock) {
          result = {
            ok: false,
            message: `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`,
          };
          return prev;
        }

        return prev.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                qty: requestedQty,
                stock: stock,
                inStock: item.inStock !== false,
              }
            : item
        );
      }

      if (prev.length === 0 && !cartPopup.hasShownSinceEmpty) {
        shouldShowFirstAddPopup = true;
      }

      return [...prev, nextItem];
    });

    if (result.ok && shouldShowFirstAddPopup) {
      showCartPopup(nextItem);
    }

    return result;
  };

  const removeFromCart = (lineId) => {
    setCartItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const updateQty = (lineId, qty) => {
    const safeQty = Math.max(1, Number(qty) || 1);
    let result = {
      ok: true,
      message: "Quantity updated.",
    };

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.lineId !== lineId) return item;

        if (isOutOfStock(item)) {
          result = {
            ok: false,
            message: "This product is out of stock.",
          };
          return item;
        }

        const stock = getNumericStock(item);
        if (stock !== null && safeQty > stock) {
          result = {
            ok: false,
            message: `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`,
          };
          return {
            ...item,
            qty: stock,
          };
        }

        return {
          ...item,
          qty: safeQty,
        };
      })
    );

    return result;
  };

  const clearCart = () => {
    setCartItems([]);
    setCartPopup({
      visible: false,
      item: null,
      hasShownSinceEmpty: false,
    });

    if (typeof window !== "undefined" && autoHideTimerRef.current) {
      window.clearTimeout(autoHideTimerRef.current);
    }
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

  const hasUnavailableItems = useMemo(() => {
    return cartItems.some((item) => {
      if (isOutOfStock(item)) return true;
      if (item.stock !== null && Number(item.qty) > item.stock) return true;
      return false;
    });
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    subtotal,
    itemCount,
    cartPopup,
    hideCartPopup,
    showCartPopup,
    hasUnavailableItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};