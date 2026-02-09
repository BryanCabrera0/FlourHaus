import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";
import { requireAdminSession } from "@/lib/adminApi";
import { sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";

type SendCustomOrderMessageBody = {
  subject?: unknown;
  message?: unknown;
  status?: unknown;
};

function toStatus(value: unknown): CustomOrderRequestStatus | null | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return null;
  }
  return CUSTOM_ORDER_REQUEST_STATUSES.includes(value as CustomOrderRequestStatus)
    ? (value as CustomOrderRequestStatus)
    : null;
}

function parseBody(body: SendCustomOrderMessageBody | null) {
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const status = toStatus(body?.status);

  if (!subject || subject.length > 180 || !message || message.length > 4000) {
    return null;
  }
  if (status === null) {
    return null;
  }

  return { subject, message, status };
}

function buildCustomerMessageText(params: {
  customerName: string;
  message: string;
  status?: CustomOrderRequestStatus;
}) {
  const statusLine = params.status
    ? `Request Status: ${params.status}`
    : "Request Status: unchanged";

  return [
    `Hi ${params.customerName},`,
    "",
    params.message,
    "",
    statusLine,
    "",
    "Thanks,",
    "Flour Haus",
  ].join("\n");
}

export async function POST(
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

  const parsedBody = parseBody(
    (await request.json().catch(() => null)) as SendCustomOrderMessageBody | null
  );
  if (!parsedBody) {
    return NextResponse.json(
      { error: "Invalid message payload. Subject and message are required." },
      { status: 400 }
    );
  }

  const customRequest = await prisma.customOrderRequest.findUnique({
    where: { id },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      status: true,
    },
  });
  if (!customRequest) {
    return NextResponse.json({ error: "Custom request not found." }, { status: 404 });
  }

  const mailText = buildCustomerMessageText({
    customerName: customRequest.customerName,
    message: parsedBody.message,
    status: parsedBody.status,
  });

  const replyToEmail = process.env.CUSTOM_ORDER_REPLY_TO_EMAIL?.trim();
  const emailResult = await sendTransactionalEmail({
    to: customRequest.customerEmail,
    subject: parsedBody.subject,
    text: mailText,
    ...(replyToEmail ? { replyTo: replyToEmail } : {}),
  });
  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error }, { status: 500 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const request = parsedBody.status
        ? await tx.customOrderRequest.update({
            where: { id },
            data: { status: parsedBody.status },
          })
        : await tx.customOrderRequest.findUnique({ where: { id } });

      if (!request) {
        throw new Error("Custom request not found.");
      }

      const message = await tx.customOrderRequestMessage.create({
        data: {
          customOrderRequestId: id,
          subject: parsedBody.subject,
          message: parsedBody.message,
          sentByEmail: auth.session.email,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "custom-order.message.send",
          entityType: "CustomOrderRequest",
          entityId: id,
          details: JSON.stringify({
            subject: parsedBody.subject,
            statusBefore: customRequest.status,
            statusAfter: request.status,
            customerEmail: customRequest.customerEmail,
            providerMessageId: emailResult.id,
          }),
          actorEmail: auth.session.email,
        },
      });

      return { request, message };
    });

    return NextResponse.json({
      request: {
        id: updated.request.id,
        status: updated.request.status,
        updatedAt: updated.request.updatedAt.toISOString(),
      },
      message: {
        id: updated.message.id,
        subject: updated.message.subject,
        createdAt: updated.message.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Email sent, but failed to persist admin message log." },
      { status: 500 }
    );
  }
}
