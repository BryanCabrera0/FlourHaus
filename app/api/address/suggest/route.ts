import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type AddressSuggestion = {
  id: string;
  label: string;
  value: string;
};

const MIN_QUERY_LENGTH = 5;
const MAX_QUERY_LENGTH = 240;
const MAX_RESULTS = 6;
const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { ts: number; suggestions: AddressSuggestion[] }>();
const inFlight = new Map<string, Promise<AddressSuggestion[]>>();

function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function formatLabel(raw: string): string {
  return raw.replace(/, United States(?: of America)?$/i, "");
}

function uniqByValue(list: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];
  for (const item of list) {
    const key = item.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchSuggestions(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(MAX_RESULTS));
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);

  // Bias results toward Miami without strictly bounding the search.
  // Nominatim expects: left, top, right, bottom.
  url.searchParams.set("viewbox", "-80.85,25.95,-80.05,25.35");

  const contact = process.env.ADMIN_EMAIL?.trim();
  if (contact) {
    url.searchParams.set("email", contact);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Nominatim requires a valid user agent.
      "User-Agent": `FlourHausAddressSuggest/1.0 (${contact ?? "no-contact"})`,
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json().catch(() => null)) as
    | Array<{ place_id?: number | string; display_name?: string }>
    | null;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const suggestions = data
    .map((entry) => {
      const displayName =
        typeof entry.display_name === "string" ? entry.display_name.trim() : "";
      if (!displayName) return null;
      const formatted = formatLabel(displayName);
      return {
        id: entry.place_id ? String(entry.place_id) : formatted,
        label: formatted,
        value: formatted,
      } satisfies AddressSuggestion;
    })
    .filter((entry): entry is AddressSuggestion => entry !== null);

  return uniqByValue(suggestions).slice(0, MAX_RESULTS);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const query = normalizeQuery(raw);

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ suggestions: [] satisfies AddressSuggestion[] });
  }

  const cached = cache.get(query);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ suggestions: cached.suggestions });
  }

  let promise = inFlight.get(query);
  if (!promise) {
    promise = fetchSuggestions(query).finally(() => {
      inFlight.delete(query);
    });
    inFlight.set(query, promise);
  }

  const suggestions = await promise;
  cache.set(query, { ts: Date.now(), suggestions });

  return NextResponse.json({ suggestions });
}

