import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CartContext = createContext(null);

export const CART_STORAGE_KEY = "beme_market_cart";
export const CART_POPUP_STORAGE_KEY = "beme_market_cart_popup_state";

function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (
    [
      "true",
      "yes",
      "1",
      "in stock",
      "instock",
      "available",
      "active",
      "abroad",
      "imported",
      "international",
    ].includes(raw)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "0",
      "out of stock",
      "outofstock",
      "unavailable",
      "inactive",
      "local",
    ].includes(raw)
  ) {
    return false;
  }

  return fallback;
}

function sanitizeText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function normalizeSelectedOptions(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== "object" || Array.isArray(selectedOptions)) {
    return {};
  }

  return Object.keys(selectedOptions)
    .sort()
    .reduce((acc, key) => {
      const safeKey = sanitizeText(key, 60);
      if (!safeKey) return acc;

      const value = selectedOptions[key];

      if (Array.isArray(value)) {
        const cleanValues = value
          .map((entry) => sanitizeText(entry, 80))
          .filter(Boolean)
          .slice(0, 20);

        if (cleanValues.length) acc[safeKey] = cleanValues;
        return acc;
      }

      if (value && typeof value === "object") {
        const nested =
          sanitizeText(value?.value, 80) ||
          sanitizeText(value?.label, 80) ||
          sanitizeText(value?.name, 80) ||
          sanitizeText(value?.title, 80);

        if (nested) acc[safeKey] = nested;
        return acc;
      }

      const cleanValue = sanitizeText(value, 80);
      if (cleanValue) acc[safeKey] = cleanValue;

      return acc;
    }, {});
}

function normalizeSelectedOptionDetails(selectedOptionDetails) {
  if (!Array.isArray(selectedOptionDetails)) return [];

  return selectedOptionDetails
    .map((item, index) => ({
      id:
        sanitizeText(item?.id, 120) ||
        `selected-option-${index}-${sanitizeText(item?.groupName || "group", 40)}`,
      groupName: sanitizeText(item?.groupName, 60),
      label: sanitizeText(item?.label, 80),
      priceBump: Math.max(0, Number(item?.priceBump || 0) || 0),
    }))
    .filter((item) => item.groupName && item.label)
    .slice(0, 40);
}

function normalizeCustomizations(customizations) {
  if (!Array.isArray(customizations)) return [];

  return customizations
    .map((entry) => {
      if (typeof entry === "string") {
        const value = sanitizeText(entry, 120);
        return value || null;
      }

      if (entry && typeof entry === "object") {
        const label = sanitizeText(
          entry?.label || entry?.name || entry?.key || entry?.title,
          60
        );
        const value = sanitizeText(
          entry?.value || entry?.selected || entry?.option || entry?.label,
          120
        );

        if (!label && !value) return null;
        return { label, value };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 40);
}

function makeLineId(product) {
  const baseId = sanitizeText(product?.id, 120);
  const selectedOptions = normalizeSelectedOptions(product?.selectedOptions);
  return `${baseId}__${JSON.stringify(selectedOptions)}`;
}

function getNumericStock(product) {
  const parsed = Number(product?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAbroadDeliveryFee(product) {
  const parsed = Number(product?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isOutOfStock(product) {
  if (!product) return true;
  if (parseBooleanish(product?.inStock, true) === false) return true;

  const stock = getNumericStock(product);
  if (stock !== null && stock <= 0) return true;

  return false;
}

function clampQtyToStock(qty, stock) {
  const safeQty = Math.max(1, Number(qty) || 1);
  if (stock === null) return safeQty;
  return Math.max(1, Math.min(safeQty, stock));
}

function buildSelectedOptionsLabelFromMap(selectedOptions) {
  return Object.entries(selectedOptions)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(", ") : value;
      return `${key}: ${displayValue}`;
    })
    .join(" • ");
}

function normalizeCartItem(product) {
  const safeSelectedOptions = normalizeSelectedOptions(product?.selectedOptions);
  const safeSelectedOptionDetails = normalizeSelectedOptionDetails(
    product?.selectedOptionDetails
  );

  const images = Array.isArray(product?.images)
    ? product.images.map((img) => sanitizeText(img, 500)).filter(Boolean)
    : [];

  const image = sanitizeText(product?.image || images[0] || "", 500);
  const stock = getNumericStock(product);
  const qty = clampQtyToStock(product?.qty, stock);
  const price = Math.max(0, Number(product?.price) || 0);

  const basePrice =
    product?.basePrice !== undefined &&
    product?.basePrice !== null &&
    product?.basePrice !== ""
      ? Math.max(0, Number(product.basePrice) || 0)
      : price;

  const optionPriceTotal =
    product?.optionPriceTotal !== undefined &&
    product?.optionPriceTotal !== null &&
    product?.optionPriceTotal !== ""
      ? Math.max(0, Number(product.optionPriceTotal) || 0)
      : safeSelectedOptionDetails.reduce(
          (sum, item) => sum + (Number(item.priceBump || 0) || 0),
          0
        );

  const oldPrice =
    product?.oldPrice !== undefined &&
    product?.oldPrice !== null &&
    product?.oldPrice !== ""
      ? Math.max(0, Number(product.oldPrice) || 0)
      : null;

  const normalized = {
    id: sanitizeText(product?.id, 120),
    lineId: sanitizeText(product?.lineId || makeLineId(product), 300),
    name: sanitizeText(product?.name || "Untitled", 160),
    price,
    basePrice,
    optionPriceTotal,
    oldPrice,
    image,
    images: images.length ? images : image ? [image] : [],
    qty,
    stock,
    inStock: parseBooleanish(product?.inStock, true),
    selectedOptions: safeSelectedOptions,
    selectedOptionsLabel: sanitizeText(product?.selectedOptionsLabel, 240),
    selectedOptionDetails: safeSelectedOptionDetails,
    customizations: normalizeCustomizations(product?.customizations),
    shipsFromAbroad:
      parseBooleanish(product?.shipsFromAbroad, false) ||
      parseBooleanish(product?.shipFromAbroad, false),
    shippingSource: sanitizeText(product?.shippingSource, 60),
    abroadDeliveryFee: getAbroadDeliveryFee(product),
    shop: sanitizeText(product?.shop || "main", 60).toLowerCase() || "main",
    productId: sanitizeText(product?.productId || product?.id, 120),
  };

  if (!normalized.selectedOptionsLabel) {
    normalized.selectedOptionsLabel =
      buildSelectedOptionsLabelFromMap(safeSelectedOptions);
  }

  return normalized;
}

function sanitizeStoredCartItems(items) {
  return items
    .map((item) => normalizeCartItem(item))
    .filter((item) => item.id && item.lineId && !isOutOfStock(item))
    .map((item) => {
      if (item.stock !== null && item.qty > item.stock) {
        return {
          ...item,
          qty: item.stock,
        };
      }
      return item;
    })
    .filter((item) => item.qty >= 1);
}

function makeDefaultPopupState() {
  return {
    visible: false,
    item: null,
    hasShownSinceEmpty: false,
    mode: "added",
    title: "",
    message: "",
    canCheckout: true,
    canContinueShopping: true,
    showConfetti: false,
    firstAdd: false,
    eventId: "",
  };
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
    return makeDefaultPopupState();
  }

  try {
    const raw = window.localStorage.getItem(CART_POPUP_STORAGE_KEY);
    if (!raw) return makeDefaultPopupState();

    const parsed = JSON.parse(raw);
    return {
      ...makeDefaultPopupState(),
      ...parsed,
      visible: Boolean(parsed?.visible),
      item: parsed?.item ? normalizeCartItem(parsed.item) : null,
      hasShownSinceEmpty: Boolean(parsed?.hasShownSinceEmpty),
      canCheckout: parsed?.canCheckout !== false,
      canContinueShopping: parsed?.canContinueShopping !== false,
      showConfetti: Boolean(parsed?.showConfetti),
      firstAdd: Boolean(parsed?.firstAdd),
      eventId: String(parsed?.eventId || ""),
      title: String(parsed?.title || ""),
      message: String(parsed?.message || ""),
      mode: String(parsed?.mode || "added"),
    };
  } catch (error) {
    console.error("Failed to read cart popup state from localStorage:", error);
    return makeDefaultPopupState();
  }
}

export function clearCartStorage() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(CART_POPUP_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear cart storage:", error);
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
            prevItem.inStock !== item.inStock ||
            Number(prevItem.price) !== Number(item.price) ||
            Number(prevItem.basePrice) !== Number(item.basePrice) ||
            Number(prevItem.optionPriceTotal) !== Number(item.optionPriceTotal) ||
            Number(prevItem.abroadDeliveryFee) !== Number(item.abroadDeliveryFee) ||
            prevItem.selectedOptionsLabel !== item.selectedOptionsLabel
          );
        });

      return changed ? sanitized : prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && autoHideTimerRef.current) {
        window.clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && cartPopup.hasShownSinceEmpty) {
      setCartPopup(makeDefaultPopupState());
    }
  }, [cartItems.length, cartPopup.hasShownSinceEmpty]);

  const clearAutoHideTimer = () => {
    if (typeof window !== "undefined" && autoHideTimerRef.current) {
      window.clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  };

  const hideCartPopup = () => {
    clearAutoHideTimer();
    setCartPopup((prev) => ({
      ...prev,
      visible: false,
      showConfetti: false,
    }));
  };

  const consumeCartPopupConfetti = () => {
    setCartPopup((prev) => ({
      ...prev,
      showConfetti: false,
    }));
  };

  const showCartPopup = (item, options = {}) => {
    clearAutoHideTimer();

    const firstAdd = Boolean(options?.firstAdd);

    const popupState = {
      visible: true,
      item: item ? normalizeCartItem(item) : null,
      hasShownSinceEmpty: true,
      mode: String(options?.mode || "added"),
      title: String(
        options?.title || (firstAdd ? "Added to cart" : "Cart updated")
      ),
      message: String(
        options?.message ||
          (firstAdd
            ? "Thank you for shopping with us. Your item has been added to cart."
            : "Your item has been added to cart.")
      ),
      canCheckout: options?.canCheckout !== false,
      canContinueShopping: options?.canContinueShopping !== false,
      showConfetti: Boolean(options?.showConfetti),
      firstAdd,
      eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    setCartPopup(popupState);
  };

  const addToCart = (product) => {
    const nextItem = normalizeCartItem(product);

    if (!nextItem.id || !nextItem.lineId) {
      return {
        ok: false,
        message: "Invalid product data.",
        reason: "invalid_product",
      };
    }

    if (isOutOfStock(nextItem)) {
      return {
        ok: false,
        message: "This product is out of stock.",
        reason: "out_of_stock",
      };
    }

    const lineId = nextItem.lineId;
    let shouldShowFirstAddPopup = false;
    let addedItemForPopup = nextItem;
    let result = { ok: true, message: "Added to cart.", reason: "added" };

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
            reason: "stock_limit",
          };
          return prev;
        }

        addedItemForPopup = {
          ...existing,
          ...nextItem,
          qty: requestedQty,
          stock,
          inStock: existing.inStock !== false,
        };

        return prev.map((item) =>
          item.lineId === lineId ? addedItemForPopup : item
        );
      }

      if (prev.length === 0 && !cartPopup.hasShownSinceEmpty) {
        shouldShowFirstAddPopup = true;
      }

      return [...prev, nextItem];
    });

    if (result.ok) {
      showCartPopup(addedItemForPopup, {
        firstAdd: shouldShowFirstAddPopup,
        showConfetti: shouldShowFirstAddPopup,
        mode: "added",
        title: "Added to cart",
        message: shouldShowFirstAddPopup
          ? "Thank you for shopping with us. Your first item has been added to cart."
          : "Your item has been added to cart.",
        canCheckout: true,
        canContinueShopping: true,
      });
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
      reason: "updated",
    };

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.lineId !== lineId) return item;

        if (isOutOfStock(item)) {
          result = {
            ok: false,
            message: "This product is out of stock.",
            reason: "out_of_stock",
          };
          return item;
        }

        const stock = getNumericStock(item);
        if (stock !== null && safeQty > stock) {
          result = {
            ok: false,
            message: `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`,
            reason: "stock_limit",
          };
          return { ...item, qty: stock };
        }

        return { ...item, qty: safeQty };
      })
    );

    return result;
  };

  const clearCart = () => {
    setCartItems([]);
    clearAutoHideTimer();
    setCartPopup(makeDefaultPopupState());
    clearCartStorage();
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
    consumeCartPopupConfetti,
    hasUnavailableItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};