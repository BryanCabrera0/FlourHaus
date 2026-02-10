"use client";

import { useEffect } from "react";
import { useCartActions } from "../components/CartProvider";

const CHECKOUT_SECRET_STORAGE_KEY = "flourhaus:checkoutClientSecret";
const CHECKOUT_SECRET_STORAGE_EVENT = "flourhaus:checkout-secret";

export default function ClearCartOnLoad() {
  const { clearCart } = useCartActions();

  useEffect(() => {
    clearCart();
    sessionStorage.removeItem(CHECKOUT_SECRET_STORAGE_KEY);
    window.dispatchEvent(new Event(CHECKOUT_SECRET_STORAGE_EVENT));
  }, [clearCart]);

  return null;
}
