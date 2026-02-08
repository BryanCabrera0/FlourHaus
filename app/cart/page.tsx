"use client";

import { useCart } from "../components/CartProvider";
import { useState } from "react";

export default function CartPage() {
  const { items, removeFromCart, getTotal } = useCart();

  const [fulfilling, setFulfilling] = useState<"pickup" | "delivery">("pickup");

  if (items.length === 0) {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A3F4B]">Your Cart</h1>
        <p className="text-[#6B5B6E] mt-4">Your cart is empty.</p>
      </div>
    );
  }

  async function handleCheckout() {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, fulfillment: fulfilling }),
    });
    const { url } = await response.json();
    window.location.href = url;
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-[#4A3F4B] mb-8">Your Cart</h1>
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#F0D9E8] mb-4">
          <div>
            <h3 className="font-semibold text-[#4A3F4B]">{item.name}</h3>
            <p className="text-sm text-[#6B5B6E]">Qty: {item.quantity} x ${item.price.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#D4A0B9]">${(item.price * item.quantity).toFixed(2)}</span>
            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-sm">
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="text-right mt-8 text-xl font-bold text-[#4A3F4B]">
        Total: ${getTotal().toFixed(2)}
      </div>
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={() => setFulfilling("pickup")}
          className={`py-2 px-6 rounded-full font-semibold transition-colors ${
            fulfilling === "pickup"
              ? "bg-[#C8A2C8] text-white"
              : "bg-white text-[#6B5B6E] border border-[#F0D9E8]"
          }`}
        >
          Pickup
        </button>
        <button
          onClick={() => setFulfilling("delivery")}
          className={`py-2 px-6 rounded-full font-semibold transition-colors ${
            fulfilling === "delivery"
              ? "bg-[#C8A2C8] text-white"
              : "bg-white text-[#6B5B6E] border border-[#F0D9E8]"
          }`}
        >
          Delivery
        </button>
      </div>
      <div className="text-right mt-4">
        <button
          onClick={handleCheckout}
          className="bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
