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
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
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
    const lineId = nextItem.lineId;

    let shouldShowFirstAddPopup = false;

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

      if (prev.length === 0 && !cartPopup.hasShownSinceEmpty) {
        shouldShowFirstAddPopup = true;
      }

      return [...prev, nextItem];
    });

    if (shouldShowFirstAddPopup) {
      showCartPopup(nextItem);
    }
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};