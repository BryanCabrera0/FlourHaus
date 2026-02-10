import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getBaseUrl } from "@/lib/stripe";

export const runtime = "nodejs";

type PaymentLinkBody = {
  amount?: unknown;
  regenerate?: unknown;
};

function parseAmount(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  // Keep it reasonable; Stripe will reject invalid/negative amounts anyway.
  const normalized = Math.round(parsed * 100) / 100;
  if (normalized <= 0 || normalized > 100000) {
    return null;
  }

  return normalized;
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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

  const body = (await request.json().catch(() => null)) as PaymentLinkBody | null;
  const amount = parseAmount(body?.amount);
  if (amount === null) {
    return NextResponse.json(
      { error: "Invalid amount. Please enter a dollar amount like 150 or 150.00." },
      { status: 400 },
    );
  }

  const regenerate = parseBoolean(body?.regenerate);
  const baseUrl = getBaseUrl(request);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customOrderRequest.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          paymentToken: true,
          paymentPaidAt: true,
          paymentCreatedAt: true,
        },
      });

      if (!existing) {
        return null;
      }

      if (existing.status === "denied") {
        throw new Error("This request is denied. Set it to accepted before requesting payment.");
      }

      if (existing.paymentPaidAt) {
        throw new Error("This request has already been paid.");
      }

      const token =
        !existing.paymentToken || regenerate ? generateToken() : existing.paymentToken;

      const requestRow = await tx.customOrderRequest.update({
        where: { id },
        data: {
          status: existing.status === "pending" ? "accepted" : existing.status,
          paymentToken: token,
          paymentAmount: amount,
          paymentCreatedAt:
            !existing.paymentToken || regenerate || !existing.paymentCreatedAt
              ? new Date()
              : existing.paymentCreatedAt,
        },
        select: {
          id: true,
          status: true,
          paymentToken: true,
          paymentAmount: true,
          paymentCreatedAt: true,
          paymentPaidAt: true,
          customerEmail: true,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "custom-order.payment-link.create",
          entityType: "CustomOrderRequest",
          entityId: id,
          details: JSON.stringify({
            amount,
            regenerate,
            customerEmail: requestRow.customerEmail,
          }),
          actorEmail: auth.session.email,
        },
      });

      return requestRow;
    });

    if (!updated) {
      return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
    }

    const paymentUrl = new URL(`/custom-order/pay/${updated.paymentToken}`, baseUrl).toString();

    return NextResponse.json({
      paymentUrl,
      request: {
        id: updated.id,
        status: updated.status,
        paymentAmount: updated.paymentAmount,
        paymentCreatedAt: updated.paymentCreatedAt?.toISOString() ?? null,
        paymentPaidAt: updated.paymentPaidAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create payment link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

