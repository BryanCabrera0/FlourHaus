type Coordinates = { lat: number; lon: number };

export const DELIVERY_ORIGIN_ADDRESS =
  "4261 SW 162nd Ct, Miami, FL 33185";

// Coordinates resolved from OpenStreetMap (Nominatim) for the origin address.
export const DELIVERY_ORIGIN_COORDS: Coordinates = {
  lat: 25.7260901,
  lon: -80.4559283,
};

export const DELIVERY_MAX_DISTANCE_MILES = 5;

type DeliveryEligibilityOk = {
  ok: true;
  eligible: boolean;
  distanceMiles: number;
  coords: Coordinates;
};

type DeliveryEligibilityError = {
  ok: false;
  error: string;
};

export type DeliveryEligibilityResult =
  | DeliveryEligibilityOk
  | DeliveryEligibilityError;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(a: Coordinates, b: Coordinates) {
  const R = 3958.7613; // Earth radius in miles
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ");
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const query = normalizeAddress(address);
  if (query.length < 5 || query.length > 240) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const contact = process.env.ADMIN_EMAIL?.trim();
  if (contact) {
    url.searchParams.set("email", contact);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Nominatim requires a user agent. Include contact if available.
      "User-Agent": `FlourHausDeliveryEligibility/1.0 (${contact ?? "no-contact"})`,
      "Accept-Language": "en",
    },
    // Keep this fast; we only need a single result.
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as
    | Array<{ lat?: string; lon?: string }>
    | null;

  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) {
    return null;
  }

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

export async function getDeliveryEligibility(
  address: string,
): Promise<DeliveryEligibilityResult> {
  const normalized = normalizeAddress(address);
  if (normalized.length < 5) {
    return { ok: false, error: "Please enter a full delivery address." };
  }

  const coords = await geocodeAddress(normalized);
  if (!coords) {
    return {
      ok: false,
      error:
        "We couldn't verify that delivery address. Try including the street, city, and ZIP code.",
    };
  }

  const distanceMiles = haversineMiles(DELIVERY_ORIGIN_COORDS, coords);
  const rounded = Math.round(distanceMiles * 100) / 100;

  return {
    ok: true,
    eligible: rounded <= DELIVERY_MAX_DISTANCE_MILES,
    distanceMiles: rounded,
    coords,
  };
}

