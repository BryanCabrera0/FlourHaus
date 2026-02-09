const DEPRECATED_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePgConnectionString(connectionString: string | undefined): string | undefined {
  if (!connectionString) {
    return connectionString;
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    return connectionString;
  }

  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  const useLibpqCompat = url.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";
  if (!sslMode || !DEPRECATED_SSL_MODES.has(sslMode) || useLibpqCompat) {
    return connectionString;
  }

  // Keep current secure behavior and silence the pg/pg-connection-string warning.
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
