"use client";

import { useCartActions, useCartState } from "../components/CartProvider";
import { useState } from "react";
import { formatCurrency } from "../lib/format";
import type { FulfillmentMethod } from "../lib/types";

export default function CartPage() {
  const { items, total } = useCartState();
  const { removeFromCart } = useCartActions();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-warm-gradient max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="panel p-14 max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#3D2B1F" }}>Your Cart</h1>
          <p className="mb-8" style={{ color: "#6B5740" }}>Your cart is empty.</p>
          <a href="/menu" className="btn-primary py-3 px-8 text-sm inline-block">
            Browse Menu
          </a>
        </div>
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
        body: JSON.stringify({ items, fulfillment, notes: orderNotes }),
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
    <div className="min-h-screen bg-warm-gradient">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold mb-10" style={{ color: "#3D2B1F" }}>Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold" style={{ color: "#3D2B1F" }}>{item.name}</h3>
                  <p className="text-sm mt-1" style={{ color: "#6B5740" }}>
                    Qty: {item.quantity} &times; {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold" style={{ color: "#8B5E3C" }}>
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button onClick={() => removeFromCart(item.id)} className="btn-remove text-sm">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="panel p-7 h-fit">
            <h2 className="text-lg font-semibold mb-5" style={{ color: "#3D2B1F" }}>Order Summary</h2>
            <div className="flex justify-between mb-2" style={{ color: "#6B5740" }}>
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="my-5" style={{ borderTop: "1px solid rgba(61, 43, 31, 0.08)" }}></div>
            <div className="flex justify-between font-bold text-lg mb-7" style={{ color: "#3D2B1F" }}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <p className="text-sm font-medium mb-3" style={{ color: "#6B5740" }}>Fulfillment Method</p>
            <div className="flex gap-3 mb-7 p-1.5 rounded-xl" style={{ backgroundColor: "rgba(61, 43, 31, 0.04)" }}>
              <button
                onClick={() => setFulfillment("pickup")}
                className={`flex-1 py-2.5 font-semibold text-sm transition-all ${fulfillment === "pickup" ? "toggle-active" : "toggle-inactive"}`}
              >
                Pickup
              </button>
              <button
                onClick={() => setFulfillment("delivery")}
                className={`flex-1 py-2.5 font-semibold text-sm transition-all ${fulfillment === "delivery" ? "toggle-active" : "toggle-inactive"}`}
              >
                Delivery
              </button>
            </div>

            <label className="text-sm font-medium block mb-2" style={{ color: "#6B5740" }}>
              Order Notes (optional)
            </label>
            <textarea
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              maxLength={500}
              placeholder="Add allergy details, pickup timing, or delivery notes."
              className="w-full mb-6 rounded-xl border border-[#E4D5C8] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9B08C]"
              rows={3}
            />

            {checkoutError ? (
              <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: "#A0555E", backgroundColor: "rgba(160, 85, 94, 0.06)" }}>{checkoutError}</p>
            ) : null}

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full btn-primary py-3.5 text-sm disabled:opacity-50"
            >
              {isCheckingOut ? "Processing..." : "Checkout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
