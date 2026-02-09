"use client";

import Link from "next/link";
import { useCartState } from "./CartProvider";

export default function CartLink() {
  const { items } = useCartState();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/cart"
      className="nav-link relative font-semibold text-xs sm:text-sm uppercase tracking-wider"
    >
      Cart
      {count > 0 ? (
        <span
          className="cart-count-badge absolute -top-2.5 -right-4 text-xs font-bold"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
