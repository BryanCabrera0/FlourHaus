"use client";

import Link from "next/link";
import { useCartState } from "./CartProvider";

export default function CartLink() {
  const { items } = useCartState();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/cart"
      className="nav-icon-btn relative inline-flex items-center justify-center"
      aria-label="Cart"
    >
      <span className="sr-only">Cart</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 4h2l2 11h11l2-7H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
      </svg>
      {count > 0 ? (
        <span
          className="cart-count-badge absolute -top-1.5 -right-1.5 text-xs font-bold"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
