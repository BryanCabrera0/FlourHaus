import Link from "next/link";

export default function MenuPage() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <Link href="/" className="text-sm text-[#C8A2C8] hover:text-[#B8A0B8] mb-4 inline-block">
        &larr; Back to Home
      </Link>
      <h1 className="text-4xl font-bold text-[#4A3F4B]">Full Menu</h1>
      <p className="text-[#6B5B6E] mt-2">Browse all of our baked goods.</p>
    </div>
  );
}
