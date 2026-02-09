import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const limit = Math.min(
    Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10) || 100, 1),
    500
  );

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    logs: logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  });
}
