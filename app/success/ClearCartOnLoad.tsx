"use client";

import { useEffect } from "react";
import { useCartActions } from "../components/CartProvider";
import { clearCheckoutClientSecret } from "@/lib/checkoutClientSecret";

export default function ClearCartOnLoad() {
  const { clearCart } = useCartActions();

  useEffect(() => {
    clearCart();
    clearCheckoutClientSecret();
  }, [clearCart]);

  return null;
}
