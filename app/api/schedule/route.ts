import { NextResponse } from "next/server";
import { getStoreSettingsSnapshot } from "@/lib/storeSettings";

export const runtime = "nodejs";

export async function GET() {
  const { schedule } = await getStoreSettingsSnapshot();
  return NextResponse.json({ schedule });
}
