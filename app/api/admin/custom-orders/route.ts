import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

function toStatus(value: string | null) {
  if (!value) {
    return null;
  }
  return CUSTOM_ORDER_REQUEST_STATUSES.includes(value as CustomOrderRequestStatus)
    ? (value as CustomOrderRequestStatus)
    : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const status = toStatus(request.nextUrl.searchParams.get("status"));
  const limit = Math.min(
    Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "200", 10) || 200, 1),
    500
  );

  const requests = await prisma.customOrderRequest.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({
    requests: requests.map((req) => ({
      id: req.id,
      customerName: req.customerName,
      customerEmail: req.customerEmail,
      customerPhone: req.customerPhone,
      desiredItems: req.desiredItems,
      requestDetails: req.requestDetails,
      requestedDate: req.requestedDate ? req.requestedDate.toISOString() : null,
      fulfillmentPreference: req.fulfillmentPreference,
      budget: req.budget,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      messages: req.messages.map((message) => ({
        id: message.id,
        subject: message.subject,
        message: message.message,
        sentByEmail: message.sentByEmail,
        createdAt: message.createdAt.toISOString(),
      })),
    })),
  });
}

