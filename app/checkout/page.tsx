"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useCartActions } from "../components/CartProvider";

const CHECKOUT_SECRET_STORAGE_KEY = "flourhaus:checkoutClientSecret";
const CHECKOUT_SECRET_STORAGE_EVENT = "flourhaus:checkout-secret";
const SSR_SNAPSHOT = "__FLOUR_HAUS_SSR__";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function subscribe(_onStoreChange: () => void) {
  function handleChange() {
    _onStoreChange();
  }

  window.addEventListener(CHECKOUT_SECRET_STORAGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(CHECKOUT_SECRET_STORAGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function getSnapshot(): string | null {
  return sessionStorage.getItem(CHECKOUT_SECRET_STORAGE_KEY);
}

function getServerSnapshot(): string {
  return SSR_SNAPSHOT;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { clearCart } = useCartActions();

  const storedSecret = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isHydrating = storedSecret === SSR_SNAPSHOT;
  const clientSecret = !isHydrating ? storedSecret : null;
  const error = !isHydrating && !clientSecret
    ? "No checkout session found. Please start checkout from your cart."
    : null;

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      onComplete: () => {
        sessionStorage.removeItem(CHECKOUT_SECRET_STORAGE_KEY);
        window.dispatchEvent(new Event(CHECKOUT_SECRET_STORAGE_EVENT));
        clearCart();
        router.replace("/success");
      },
    };
  }, [clientSecret, clearCart, router]);

  function handleBackToCart() {
    sessionStorage.removeItem(CHECKOUT_SECRET_STORAGE_KEY);
    window.dispatchEvent(new Event(CHECKOUT_SECRET_STORAGE_EVENT));
    router.push("/cart");
  }

  return (
    <div className="bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="panel p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="kicker kicker-accent mb-2">Secure Checkout</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-fh-heading">
                Checkout
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBackToCart}
                className="btn-ghost py-2.5 px-4 text-xs"
              >
                Back to cart
              </button>
              <Link href="/menu" className="btn-admin-nav py-2.5 px-4 text-xs">
                Continue shopping
              </Link>
            </div>
          </div>

          {publishableKey ? null : (
            <p className="feedback-error text-sm p-3 rounded-lg">
              Stripe is not configured (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
            </p>
          )}

          {error ? (
            <div className="feedback-error text-sm p-3 rounded-lg">
              <p className="font-semibold mb-1">Checkout unavailable</p>
              <p>{error}</p>
            </div>
          ) : null}

          {!error && stripePromise && options ? (
            <div className="mt-6">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : error ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleBackToCart}
                className="btn-primary py-3 px-6 text-sm"
              >
                Return to cart
              </button>
            </div>
          ) : (
            <p className="text-sm text-fh-muted">Loading checkout...</p>
          )}
        </div>
      </div>
    </div>
  );
}
