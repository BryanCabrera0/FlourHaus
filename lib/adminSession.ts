export const ADMIN_SESSION_COOKIE_NAME = "flour_haus_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type AdminSessionPayload = {
  email: string;
  iat: number;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(input: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createAdminSessionToken(
  email: string,
  secret: string,
  maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email,
    iat: issuedAt,
    exp: issuedAt + maxAgeSeconds,
  };
  const payloadSegment = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${header}.${payloadSegment}`;
  const signature = await sign(signingInput, secret);
  return `${signingInput}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string
): Promise<AdminSessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const expectedSignature = await sign(
    `${headerSegment}.${payloadSegment}`,
    secret
  );
  if (!constantTimeEqual(signatureSegment, expectedSignature)) {
    return null;
  }

  const payloadBytes = base64UrlToBytes(payloadSegment);
  if (!payloadBytes) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoder.decode(payloadBytes)) as Partial<AdminSessionPayload>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      email: parsed.email,
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
