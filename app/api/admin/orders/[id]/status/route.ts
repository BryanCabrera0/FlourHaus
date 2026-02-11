import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ORDER_STATUSES } from "@/lib/types";
import { requireAdminSession } from "@/lib/adminApi";
import { DELIVERY_ORIGIN_ADDRESS } from "@/lib/delivery";
import { isEmailSendingConfigured, sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";

type StatusUpdateRequest = {
  status?: unknown;
};

type PickupReadyNotification =
  | { status: "sent"; to: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function buildPickupReadyEmailText(params: {
  customerName: string | null;
  orderId: number;
  pickupAddress: string;
}) {
  const name = params.customerName?.trim() ? params.customerName.trim() : "there";
  return [
    `Hi ${name},`,
    "",
    `Your Flour Haus order #${params.orderId} is ready for pickup.`,
    "",
    "Pickup address:",
    params.pickupAddress,
    "",
    "Thanks,",
    "Flour Haus",
  ].join("\n");
}

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
    const result = await prisma.$transaction(async (tx) => {
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

      return { order, previousStatus: existing.status };
    });

    if (!result) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const updatedOrder = result.order;
    const previousStatus = result.previousStatus;

    let pickupReadyNotification: PickupReadyNotification | null = null;

    if (
      previousStatus !== "ready" &&
      updatedOrder.status === "ready" &&
      updatedOrder.fulfillment === "pickup"
    ) {
      const customerEmail = updatedOrder.customerEmail?.trim() ?? "";
      if (!customerEmail) {
        pickupReadyNotification = {
          status: "skipped",
          reason: "Customer email is missing; no pickup notification sent.",
        };
      } else if (!isEmailSendingConfigured()) {
        pickupReadyNotification = {
          status: "skipped",
          reason: "Email is not configured; set RESEND_API_KEY and RESEND_FROM_EMAIL.",
        };
      } else {
        const emailResult = await sendTransactionalEmail({
          to: customerEmail,
          subject: "Your Flour Haus order is ready for pickup",
          text: buildPickupReadyEmailText({
            customerName: updatedOrder.customerName ?? null,
            orderId: updatedOrder.id,
            pickupAddress: DELIVERY_ORIGIN_ADDRESS,
          }),
        });

        pickupReadyNotification = emailResult.ok
          ? { status: "sent", to: customerEmail }
          : { status: "failed", error: emailResult.error };
      }

      try {
        await prisma.adminAuditLog.create({
          data: {
            action: "order.pickup-ready.notification",
            entityType: "Order",
            entityId: updatedOrder.id,
            details: JSON.stringify({
              fulfillment: updatedOrder.fulfillment,
              status: updatedOrder.status,
              customerEmail: updatedOrder.customerEmail,
              result: pickupReadyNotification,
            }),
            actorEmail: auth.session.email,
          },
        });
      } catch {
        // Non-critical: status update already succeeded.
      }
    }

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
      ...(pickupReadyNotification ? { pickupReadyNotification } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
