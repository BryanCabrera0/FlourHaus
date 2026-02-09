"use client";

import Link from "next/link";
import { useCartActions, useCartState } from "../components/CartProvider";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FulfillmentMethod } from "@/lib/types";

export default function CartPage() {
  const { items, total } = useCartState();
  const { removeFromCart } = useCartActions();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-surface max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="panel p-14 max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-3 text-fh-heading">Your Cart</h1>
          <p className="mb-8 text-fh-muted">Your cart is empty.</p>
          <Link href="/menu" className="btn-primary py-3 px-8 text-sm inline-block">
            Browse Menu
          </Link>
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
    <div className="bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold mb-10 text-fh-heading">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-fh-heading">{item.name}</h3>
                  <p className="text-sm mt-1 text-fh-muted">
                    Qty: {item.quantity} &times; {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-fh-success">
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
          <div className="panel cart-summary-panel p-7 h-fit">
            <h2 className="text-lg font-semibold mb-5 text-fh-heading">Order Summary</h2>
            <div className="flex justify-between mb-2 text-fh-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="my-5 border-t surface-divider"></div>
            <div className="flex justify-between font-bold text-lg mb-7 text-fh-heading">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <p className="text-sm font-medium mb-3 text-fh-muted">Fulfillment Method</p>
            <div className="flex gap-3 mb-7 p-1.5 rounded-xl bg-[#eef8f3]">
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

            <label className="text-sm font-medium block mb-2 text-fh-muted">
              Order Notes (optional)
            </label>
            <textarea
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              maxLength={500}
              placeholder="Add allergy details, pickup timing, or delivery notes."
              className="w-full mb-6 rounded-xl px-3 py-2.5 text-sm input-soft"
              rows={3}
            />

            {checkoutError ? (
              <p className="feedback-error text-sm mb-4 p-3 rounded-lg">{checkoutError}</p>
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
