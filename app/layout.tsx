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
      <body className="antialiased">
        <CartProvider>
          <nav className="nav-glass sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <Link href="/" className="font-bold text-xl tracking-wide" style={{ fontFamily: "Poppins, sans-serif", color: "#8B5E3C" }}>
                Flour Haus
              </Link>
              <div className="flex gap-8 items-center">
                <Link href="/menu" className="font-medium text-sm uppercase tracking-wider transition-colors" style={{ color: "#5C4033" }}>Menu</Link>
                <Link href="/about" className="font-medium text-sm uppercase tracking-wider transition-colors" style={{ color: "#5C4033" }}>About</Link>
                <CartLink />
              </div>
            </div>
          </nav>
          {children}
        </CartProvider>
        <footer className="footer-gradient mt-20" style={{ color: "#D4B89C" }}>
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <h3 className="font-semibold text-lg mb-3" style={{ fontFamily: "Poppins, sans-serif", color: "#F0E0D0" }}>Flour Haus</h3>
                <p className="text-sm leading-relaxed opacity-80">Homemade baked goods made with love in Miami. From classic cakes to fresh pastries, every bite is crafted with the finest ingredients.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3" style={{ color: "#F0E0D0" }}>Quick Links</h4>
                <div className="flex flex-col gap-2.5 text-sm">
                  <Link href="/menu" className="opacity-80 hover:opacity-100 transition-opacity">Menu</Link>
                  <Link href="/about" className="opacity-80 hover:opacity-100 transition-opacity">About</Link>
                  <Link href="/cart" className="opacity-80 hover:opacity-100 transition-opacity">Cart</Link>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3" style={{ color: "#F0E0D0" }}>Order Info</h4>
                <p className="text-sm leading-relaxed opacity-80">Pickup &amp; local delivery available in the Miami area. Place your order online and we&apos;ll have it ready for you.</p>
              </div>
            </div>
            <div className="mt-10 pt-6 text-center text-sm opacity-60" style={{ borderTop: "1px solid rgba(212, 184, 156, 0.2)" }}>
              <p>&copy; {new Date().getFullYear()} Flour Haus. All rights reserved.</p>
              <Link href="/admin/login" className="inline-block mt-2 opacity-50 hover:opacity-80 transition-opacity text-xs">
                Owner Login
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
