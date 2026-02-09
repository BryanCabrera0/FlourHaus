import { NextResponse, type NextRequest } from "next/server";
import { getAdminSessionFromRequest } from "./adminAuth";

export async function requireAdminSession(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    session,
  };
}
