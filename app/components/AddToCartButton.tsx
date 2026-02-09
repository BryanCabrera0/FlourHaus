"use client";

import { memo, useCallback } from "react";
import { useCartActions } from "./CartProvider";
import type { CartItemInput } from "@/lib/types";

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
      className="mt-4 w-full btn-primary text-sm py-2.5 px-4 cursor-pointer"
    >
      Add to Cart
    </button>
  );
}

export default memo(AddToCartButton);
