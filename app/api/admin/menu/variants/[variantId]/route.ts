import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

type UpdateVariantBody = {
  label?: unknown;
  unitCount?: unknown;
  price?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

function parseUpdateBody(body: UpdateVariantBody | null) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const updateData: Record<string, unknown> = {};

  if (body.label !== undefined) {
    if (typeof body.label !== "string") {
      return null;
    }
    const label = body.label.trim();
    if (!label || label.length > 60) {
      return null;
    }
    updateData.label = label;
  }

  if (body.unitCount !== undefined) {
    const unitCount =
      typeof body.unitCount === "number" ? body.unitCount : Number(body.unitCount);
    if (!Number.isInteger(unitCount) || unitCount <= 0) {
      return null;
    }
    updateData.unitCount = unitCount;
  }

  if (body.price !== undefined) {
    const price = typeof body.price === "number" ? body.price : Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return null;
    }
    updateData.price = price;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder =
      typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      return null;
    }
    updateData.sortOrder = sortOrder;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return null;
    }
    updateData.isActive = body.isActive;
  }

  return Object.keys(updateData).length > 0 ? updateData : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ variantId: string }> }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { variantId: variantParam } = await context.params;
  const variantId = Number.parseInt(variantParam, 10);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return NextResponse.json({ error: "Invalid variant id." }, { status: 400 });
  }

  const updateData = parseUpdateBody(
    (await request.json().catch(() => null)) as UpdateVariantBody | null
  );
  if (!updateData) {
    return NextResponse.json({ error: "Invalid variant update payload." }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItemVariant.findUnique({ where: { id: variantId } });
      if (!existing) {
        return null;
      }

      const variant = await tx.menuItemVariant.update({
        where: { id: variantId },
        data: updateData,
      });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.variant.update",
          entityType: "MenuItemVariant",
          entityId: variantId,
          details: JSON.stringify({
            menuItemId: existing.menuItemId,
            before: {
              label: existing.label,
              unitCount: existing.unitCount,
              price: existing.price,
              isActive: existing.isActive,
              sortOrder: existing.sortOrder,
            },
            after: updateData,
          }),
          actorEmail: auth.session.email,
        },
      });

      return variant;
    });

    if (!updated) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    return NextResponse.json({
      variant: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update variant." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ variantId: string }> }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { variantId: variantParam } = await context.params;
  const variantId = Number.parseInt(variantParam, 10);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return NextResponse.json({ error: "Invalid variant id." }, { status: 400 });
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItemVariant.findUnique({ where: { id: variantId } });
      if (!existing) {
        return null;
      }

      await tx.menuItemVariant.delete({ where: { id: variantId } });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.variant.delete",
          entityType: "MenuItemVariant",
          entityId: variantId,
          details: JSON.stringify({
            menuItemId: existing.menuItemId,
            label: existing.label,
            unitCount: existing.unitCount,
            price: existing.price,
          }),
          actorEmail: auth.session.email,
        },
      });

      return existing;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete variant." }, { status: 500 });
  }
}
