import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

function normalizeSelectedOptions(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== "object") return {};
  return Object.keys(selectedOptions)
    .sort()
    .reduce((acc, key) => {
      acc[key] = selectedOptions[key];
      return acc;
    }, {});
}

function makeLineId(product) {
  const baseId = product.id || "";
  const selectedOptions = normalizeSelectedOptions(product.selectedOptions);
  return `${baseId}__${JSON.stringify(selectedOptions)}`;
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    const lineId = makeLineId(product);

    setCartItems((prev) => {
      const existing = prev.find((item) => item.lineId === lineId);

      if (existing) {
        return prev.map((item) =>
          item.lineId === lineId
            ? { ...item, qty: Number(item.qty || 1) + Number(product.qty || 1) }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          lineId,
          qty: Number(product.qty || 1),
          selectedOptions: normalizeSelectedOptions(product.selectedOptions),
          selectedOptionsLabel: product.selectedOptionsLabel || "",
        },
      ];
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

  const clearCart = () => setCartItems([]);

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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};