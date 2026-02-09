import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-success-tint max-w-6xl mx-auto px-6 py-24 text-center">
      <div className="panel glow-warm max-w-md mx-auto p-14">
        <p className="uppercase tracking-[0.2em] text-sm font-medium mb-4" style={{ color: "#4DAE8A" }}>Order Confirmed</p>
        <h1 className="text-4xl font-bold mb-4" style={{ color: "#332B52" }}>Thank You!</h1>
        <p className="text-lg mb-10 leading-relaxed" style={{ color: "#5E5580" }}>Your order has been placed. We&apos;ll start baking your treats right away.</p>
        <Link href="/" className="btn-primary py-3.5 px-10 text-sm inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
