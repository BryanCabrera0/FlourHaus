import Link from "next/link";


export default function SuccessPage() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-[#4A3F4B]">Thank you for your order!</h1>
      <p className="text-[#6B5B6E] mt-2">Your delicious treats will be with you soon.</p>
      <Link href="/" className="mt-6 inline-block bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white font-bold py-3 px-8 rounded-full transition-colors">
        Back to Home
      </Link>
    </div>
  );
}