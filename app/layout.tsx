import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { CartProvider } from "./components/CartProvider";
import CartLink from "./components/CartLink";

export const metadata: Metadata = {
  title: "Flour Haus",
  description: "Fresh baked goods in Miami from Flour Haus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <nav className="nav-glass sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex justify-between items-center gap-4">
              <Link href="/" className="font-bold text-xl tracking-wide brand-text [font-family:Poppins,sans-serif]">
                Flour Haus
              </Link>
              <div className="flex gap-4 sm:gap-7 items-center">
                <Link href="/menu" className="nav-link font-semibold text-sm uppercase tracking-wider">Menu</Link>
                <Link href="/about" className="nav-link font-semibold text-sm uppercase tracking-wider">About</Link>
                <CartLink />
              </div>
            </div>
          </nav>
          <div className="flex-1">{children}</div>
        </CartProvider>
        <footer className="footer-surface mt-20 text-fh-body">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-fh-heading [font-family:Poppins,sans-serif]">Flour Haus</h3>
                <p className="text-[0.95rem] leading-relaxed text-fh-body">Homemade baked goods made with love in Miami. From classic cakes to fresh pastries, every bite is crafted with the finest ingredients.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-fh-heading">Quick Links</h4>
                <div className="flex flex-col gap-2.5 text-[0.95rem]">
                  <Link href="/menu" className="footer-link">Menu</Link>
                  <Link href="/about" className="footer-link">About</Link>
                  <Link href="/cart" className="footer-link">Cart</Link>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-fh-heading">Order Info</h4>
                <p className="text-[0.95rem] leading-relaxed text-fh-body">Pickup &amp; local delivery available in the Miami area. Place your order online and we&apos;ll have it ready for you.</p>
              </div>
            </div>
            <div className="mt-10 pt-6 text-center text-sm text-fh-muted border-t surface-divider">
              <p>&copy; {new Date().getFullYear()} Flour Haus. All rights reserved.</p>
              <Link href="/admin/login" className="inline-block mt-2 footer-link text-xs">
                Owner Login
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
