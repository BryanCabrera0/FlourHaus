import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES, FULFILLMENT_METHODS } from "@/lib/types";
import { parseOrderItems } from "@/lib/orderItems";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

function toOrderStatus(value: string | null) {
  if (!value) {
    return null;
  }
  return ORDER_STATUSES.includes(value as (typeof ORDER_STATUSES)[number])
    ? (value as (typeof ORDER_STATUSES)[number])
    : null;
}

function toFulfillment(value: string | null) {
  if (!value) {
    return null;
  }
  return FULFILLMENT_METHODS.includes(value as (typeof FULFILLMENT_METHODS)[number])
    ? (value as (typeof FULFILLMENT_METHODS)[number])
    : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const status = toOrderStatus(request.nextUrl.searchParams.get("status"));
  const fulfillment = toFulfillment(request.nextUrl.searchParams.get("fulfillment"));
  const limit = Math.min(
    Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10) || 100, 1),
    500
  );

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(fulfillment ? { fulfillment } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      items: parseOrderItems(order.items),
      total: order.total,
      fulfillment: order.fulfillment,
      scheduledDate: order.scheduledDate,
      scheduledTimeSlot: order.scheduledTimeSlot,
      deliveryAddress: order.deliveryAddress,
      stripeSessionId: order.stripeSessionId,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
  });
}
