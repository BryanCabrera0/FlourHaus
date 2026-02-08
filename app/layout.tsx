import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="bg-[#C8A2C8] p-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-white font-bold text-lg">
              Christine&apos;s Bakery
            </Link>
            <div className="flex gap-6">
              <Link href="/menu" className="text-white hover:text-[#F0D9E8] transition-colors">Menu</Link>
              <Link href="/about" className="text-white hover:text-[#F0D9E8] transition-colors">About</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
