export const CHECKOUT_SECRET_STORAGE_KEY = "flourhaus:checkoutClientSecret";
export const CHECKOUT_SECRET_STORAGE_EVENT = "flourhaus:checkout-secret";
export const CHECKOUT_SECRET_SSR_SNAPSHOT = "__FLOUR_HAUS_SSR__";

export function readCheckoutClientSecret(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(CHECKOUT_SECRET_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCheckoutClientSecret(secret: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(CHECKOUT_SECRET_STORAGE_KEY, secret);
  } catch {
    // Ignore storage failures (private browsing / disabled storage).
  } finally {
    window.dispatchEvent(new Event(CHECKOUT_SECRET_STORAGE_EVENT));
  }
}

export function clearCheckoutClientSecret() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(CHECKOUT_SECRET_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  } finally {
    window.dispatchEvent(new Event(CHECKOUT_SECRET_STORAGE_EVENT));
  }
}

export function subscribeCheckoutClientSecret(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handler() {
    onStoreChange();
  }

  window.addEventListener(CHECKOUT_SECRET_STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(CHECKOUT_SECRET_STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

