import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/app/lib/prisma";
import { ORDER_STATUSES } from "@/app/lib/types";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

type StatusUpdateRequest = {
  status?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id: idParam } = await context.params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as StatusUpdateRequest | null;
  const status =
    typeof body?.status === "string" &&
    ORDER_STATUSES.includes(body.status as (typeof ORDER_STATUSES)[number])
      ? (body.status as (typeof ORDER_STATUSES)[number])
      : null;
  if (!status) {
    return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }

      const order = await tx.order.update({
        where: { id },
        data: { status },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "order.status.update",
          entityType: "Order",
          entityId: id,
          details: JSON.stringify({
            from: existing.status,
            to: status,
            stripeSessionId: existing.stripeSessionId,
          }),
          actorEmail: auth.session.email,
        },
      });

      return order;
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
