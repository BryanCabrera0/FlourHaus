"use client";

import { useCart } from "../components/CartProvider";

export default function CartPage() {
  const { items, removeFromCart, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A3F4B]">Your Cart</h1>
        <p className="text-[#6B5B6E] mt-4">Your cart is empty.</p>
      </div>
    );
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
    </div>
  );
}
    