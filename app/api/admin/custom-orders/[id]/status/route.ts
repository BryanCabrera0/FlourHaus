import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

type UpdateCustomOrderStatusBody = {
  status?: unknown;
};

function toStatus(value: unknown): CustomOrderRequestStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  return CUSTOM_ORDER_REQUEST_STATUSES.includes(value as CustomOrderRequestStatus)
    ? (value as CustomOrderRequestStatus)
    : null;
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
    return NextResponse.json({ error: "Invalid custom request id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | UpdateCustomOrderStatusBody
    | null;
  const status = toStatus(body?.status);
  if (!status) {
    return NextResponse.json({ error: "Invalid custom request status." }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customOrderRequest.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }

      const request = await tx.customOrderRequest.update({
        where: { id },
        data: { status },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "custom-order.status.update",
          entityType: "CustomOrderRequest",
          entityId: id,
          details: JSON.stringify({
            from: existing.status,
            to: status,
            customerEmail: existing.customerEmail,
          }),
          actorEmail: auth.session.email,
        },
      });

      return request;
    });

    if (!updated) {
      return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
    }

    return NextResponse.json({
      request: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update custom request status." },
      { status: 500 }
    );
  }
}

