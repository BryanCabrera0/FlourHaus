import { NextResponse } from "next/server";
import { getDeliveryEligibility } from "@/lib/delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { address?: unknown }
    | null;

  const address = typeof body?.address === "string" ? body.address : "";
  const result = await getDeliveryEligibility(address);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    { eligible: result.eligible, distanceMiles: result.distanceMiles },
    { status: 200 },
  );
}

