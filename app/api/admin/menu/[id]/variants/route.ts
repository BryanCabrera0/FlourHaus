import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

type CreateVariantBody = {
  label?: unknown;
  unitCount?: unknown;
  price?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

function parseBody(body: CreateVariantBody | null) {
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const unitCountRaw =
    typeof body?.unitCount === "number" ? body.unitCount : Number(body?.unitCount);
  const priceRaw = typeof body?.price === "number" ? body.price : Number(body?.price);
  const sortOrderRaw =
    typeof body?.sortOrder === "number" ? body.sortOrder : Number(body?.sortOrder);

  const unitCount = Number.isInteger(unitCountRaw) ? unitCountRaw : null;
  const sortOrder = Number.isInteger(sortOrderRaw) ? sortOrderRaw : 0;
  const price = Number.isFinite(priceRaw) ? priceRaw : null;

  if (!label || label.length > 60 || unitCount === null || unitCount <= 0 || price === null || price < 0) {
    return null;
  }

  return {
    label,
    unitCount,
    price,
    sortOrder,
    isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
  };
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
  const menuItemId = Number.parseInt(idParam, 10);
  if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
    return NextResponse.json({ error: "Invalid menu item id." }, { status: 400 });
  }

  const parsedBody = parseBody(
    (await request.json().catch(() => null)) as CreateVariantBody | null
  );
  if (!parsedBody) {
    return NextResponse.json(
      { error: "Invalid variant payload. Label, unit count, and a non-negative price are required." },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem) {
        return null;
      }

      const variant = await tx.menuItemVariant.create({
        data: {
          menuItemId,
          ...parsedBody,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.variant.create",
          entityType: "MenuItemVariant",
          entityId: variant.id,
          details: JSON.stringify({
            menuItemId,
            label: variant.label,
            unitCount: variant.unitCount,
            price: variant.price,
            isActive: variant.isActive,
            sortOrder: variant.sortOrder,
          }),
          actorEmail: auth.session.email,
        },
      });

      return variant;
    });

    if (!created) {
      return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        variant: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create variant." }, { status: 500 });
  }
}
