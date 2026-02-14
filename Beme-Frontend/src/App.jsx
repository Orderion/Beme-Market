Import { useState } from "react";
import Home from "./pages/Home";
import CartDrawer from "./components/CartDrawer";

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Home />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  );
}