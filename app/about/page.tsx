import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <Link href="/" className="text-sm text-[#C8A2C8] hover:text-[#B8A0B8] mb-4 inline-block">
        &larr; Back to Home
      </Link>
      <h1 className="text-4xl font-bold text-[#4A3F4B]">About Us</h1>
      <p className="text-[#6B5B6E] mt-2">
        Christine&apos;s Bakery is a family-owned business that has been serving the Miami community for over 20 years. We pride ourselves on using the freshest ingredients and traditional recipes to create delicious baked goods that bring joy to our customers.
      </p>
      <p className="text-[#6B5B6E] mt-4">
        Our mission is to provide a warm and welcoming atmosphere where everyone can enjoy a sweet treat. Whether you&apos;re stopping by for a morning croissant or picking up a cake for a special occasion, we are dedicated to making your experience delightful.
      </p>
    </div>
  );
}