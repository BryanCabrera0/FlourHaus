"use client";

import { useCartActions, useCartState } from "../components/CartProvider";
import { useState } from "react";
import { formatCurrency } from "../lib/format";
import type { FulfillmentMethod } from "../lib/types";

export default function CartPage() {
  const { items, total } = useCartState();
  const { removeFromCart } = useCartActions();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A3F4B]">Your Cart</h1>
        <p className="text-[#6B5B6E] mt-4">Your cart is empty.</p>
      </div>
    );
  }

  async function handleCheckout() {
    setCheckoutError(null);
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillment }),
      });

      const data: unknown = await response.json();
      const checkoutUrl =
        typeof data === "object" &&
        data !== null &&
        "url" in data &&
        typeof data.url === "string"
          ? data.url
          : null;

      if (!response.ok || !checkoutUrl) {
        throw new Error("Failed to create checkout session");
      }

      window.location.assign(checkoutUrl);
    } catch {
      setCheckoutError("Unable to start checkout right now. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-[#4A3F4B] mb-8">Your Cart</h1>
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#F0D9E8] mb-4">
          <div>
            <h3 className="font-semibold text-[#4A3F4B]">{item.name}</h3>
            <p className="text-sm text-[#6B5B6E]">
              Qty: {item.quantity} x {formatCurrency(item.price)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#D4A0B9]">
              {formatCurrency(item.price * item.quantity)}
            </span>
            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-sm">
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="text-right mt-8 text-xl font-bold text-[#4A3F4B]">
        Total: {formatCurrency(total)}
      </div>
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={() => setFulfillment("pickup")}
          className={`py-2 px-6 rounded-full font-semibold transition-colors ${
            fulfillment === "pickup"
              ? "bg-[#C8A2C8] text-white"
              : "bg-white text-[#6B5B6E] border border-[#F0D9E8]"
          }`}
        >
          Pickup
        </button>
        <button
          onClick={() => setFulfillment("delivery")}
          className={`py-2 px-6 rounded-full font-semibold transition-colors ${
            fulfillment === "delivery"
              ? "bg-[#C8A2C8] text-white"
              : "bg-white text-[#6B5B6E] border border-[#F0D9E8]"
          }`}
        >
          Delivery
        </button>
      </div>
      {checkoutError ? (
        <p className="text-right mt-4 text-sm text-red-600">{checkoutError}</p>
      ) : null}
      <div className="text-right mt-4">
        <button
          onClick={handleCheckout}
          disabled={isCheckingOut}
          className="bg-[#C8A2C8] hover:bg-[#B8A0B8] disabled:bg-[#D9C2D9] text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          {isCheckingOut ? "Processing..." : "Checkout"}
        </button>
      </div>
    </div>
  );
}
