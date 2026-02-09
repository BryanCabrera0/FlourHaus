"use client";

import Link from "next/link";
import { useCartState } from "./CartProvider";

export default function CartLink() {
  const { items } = useCartState();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link href="/cart" className="relative font-medium text-sm uppercase tracking-wider transition-colors" style={{ color: "#4A4068" }}>
      Cart
      {count > 0 ? (
        <span
          className="absolute -top-2.5 -right-5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold leading-none"
          style={{ backgroundColor: "#E0709A", color: "#FFFFFF", fontSize: "11px", padding: "0 5px" }}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
