"use client";

import { useCart } from "./CartProvider";

export default function AddToCartButton({ id, name, price }: { id: number; name: string; price: number }) {
  const { addToCart } = useCart();

  return (
    <button
      onClick={() => addToCart({ id, name, price })}
      className="mt-4 bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors"
    >
      Add to Cart
    </button>
  );
}
