import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { CartProvider } from "./components/CartProvider";

export const metadata: Metadata = {
  title: "Christine's Bakery",
  description: "Fresh baked goods in Miami",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="bg-[#C8A2C8] p-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-white font-bold text-lg">
              Christine&apos;s Bakery
            </Link>
            <div className="flex gap-6">
              <Link href="/menu" className="text-white hover:text-[#F0D9E8] transition-colors">Menu</Link>
              <Link href="/about" className="text-white hover:text-[#F0D9E8] transition-colors">About</Link>
              <Link href="/cart" className="text-white hover:text-[#F0D9E8] transition-colors">Cart</Link>
            </div>
          </div>
        </nav>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
