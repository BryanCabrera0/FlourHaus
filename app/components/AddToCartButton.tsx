"use client";

import { memo, useCallback } from "react";
import { useCartActions } from "./CartProvider";
import type { CartItemInput } from "@/lib/types";

type AddToCartButtonProps = CartItemInput;

function AddToCartButton({
  menuItemId,
  variantId,
  name,
  variantLabel,
  unitPrice,
}: AddToCartButtonProps) {
  const { addToCart } = useCartActions();
  const handleAddToCart = useCallback(() => {
    addToCart({ menuItemId, variantId, name, variantLabel, unitPrice });
  }, [addToCart, menuItemId, name, unitPrice, variantId, variantLabel]);

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
