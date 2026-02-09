"use client";

import { memo, useCallback } from "react";
import { useCartActions } from "./CartProvider";
import type { CartItemInput } from "../lib/types";

type AddToCartButtonProps = CartItemInput;

function AddToCartButton({
  id,
  name,
  price,
}: AddToCartButtonProps) {
  const { addToCart } = useCartActions();
  const handleAddToCart = useCallback(() => {
    addToCart({ id, name, price });
  }, [addToCart, id, name, price]);

  return (
    <button
      onClick={handleAddToCart}
      className="mt-4 bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors"
    >
      Add to Cart
    </button>
  );
}

export default memo(AddToCartButton);
