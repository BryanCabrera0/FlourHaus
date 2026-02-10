import Link from "next/link";
import ClearCartOnLoad from "./ClearCartOnLoad";

export default function SuccessPage() {
  return (
    <div className="bg-success-tint max-w-6xl mx-auto px-6 py-20 text-center">
      <ClearCartOnLoad />
      <div className="panel glow-warm max-w-md mx-auto p-14">
        <p className="kicker kicker-success mb-4">Order Confirmed</p>
        <h1 className="text-4xl font-bold mb-4 text-fh-heading">Thank You!</h1>
        <p className="text-lg mb-10 leading-relaxed text-fh-muted">Your order has been placed. We&apos;ll start baking your treats right away.</p>
        <Link href="/" className="btn-primary py-3.5 px-10 text-sm inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
