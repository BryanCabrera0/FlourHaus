"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders", exact: false },
  { href: "/admin/custom-orders", label: "Custom Orders", exact: false },
  { href: "/admin/menu", label: "Menu", exact: false },
  { href: "/admin/scheduling", label: "Scheduling", exact: false },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean): boolean {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${
            isActive(link.href, link.exact)
              ? "btn-admin-nav-active"
              : "btn-admin-nav"
          } py-2 px-4 text-xs`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
