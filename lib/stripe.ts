import "server-only";
import Stripe from "stripe";

type StripeSecretKeyConfig = {
  key: string;
  source: "STRIPE_SECRET_KEY" | "STRIPE_PLATFORM_SECRET_KEY";
};

export function readStripeSecretKey(): StripeSecretKeyConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (secretKey) {
    return { key: secretKey, source: "STRIPE_SECRET_KEY" };
  }

  const platformSecretKey = process.env.STRIPE_PLATFORM_SECRET_KEY?.trim();
  if (platformSecretKey) {
    return { key: platformSecretKey, source: "STRIPE_PLATFORM_SECRET_KEY" };
  }

  return null;
}

export function getStripeClient(): Stripe | null {
  const config = readStripeSecretKey();
  if (!config) {
    return null;
  }

  return new Stripe(config.key);
}

export function getBaseUrl(request: Request): string {
  function isLocalhost(hostname: string) {
    const normalized = hostname.toLowerCase();
    return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
  }

  function getConfiguredOrigin(): string | null {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (!configuredBaseUrl) {
      return null;
    }

    try {
      const url = new URL(configuredBaseUrl);
      const protocol = url.protocol.toLowerCase();
      const localhost = isLocalhost(url.hostname);

      // Only accept HTTPS, or HTTP for localhost.
      const protocolOk = protocol === "https:" || (protocol === "http:" && localhost);
      if (!protocolOk) {
        return null;
      }

      // Avoid broken production redirects when someone accidentally leaves localhost configured.
      if (process.env.NODE_ENV === "production" && localhost) {
        return null;
      }

      return url.origin;
    } catch {
      return null;
    }
  }

  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    // Vercel provides this as a hostname without protocol.
    if (vercelUrl.includes("://")) {
      try {
        return new URL(vercelUrl).origin;
      } catch {
        // Fall through to request origin.
      }
    } else {
      return `https://${vercelUrl}`;
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}
