import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

type CreateMenuItemBody = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  isFeatured?: unknown;
  featuredSortOrder?: unknown;
};

function normalizeOptionalImageUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Allow local/static paths (ex: /uploads/menu-images/foo.jpg).
  // Reject protocol-relative URLs (//example.com) which can bypass URL parsing.
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseCreateBody(body: CreateMenuItemBody | null) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const price = typeof body?.price === "number" ? body.price : Number(body?.price);
  const sortOrderRaw =
    typeof body?.sortOrder === "number" ? body.sortOrder : Number(body?.sortOrder);
  const sortOrder = Number.isInteger(sortOrderRaw) ? sortOrderRaw : 0;
  const featuredSortOrderRaw =
    typeof body?.featuredSortOrder === "number"
      ? body.featuredSortOrder
      : Number(body?.featuredSortOrder);
  const featuredSortOrder = Number.isInteger(featuredSortOrderRaw) ? featuredSortOrderRaw : 0;

  if (!name || !description || !category || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    name,
    description,
    category,
    price,
    imageUrl: normalizeOptionalImageUrl(body?.imageUrl),
    isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
    sortOrder,
    isFeatured: typeof body?.isFeatured === "boolean" ? body.isFeatured : false,
    featuredSortOrder,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ menuItems });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = parseCreateBody(
    (await request.json().catch(() => null)) as CreateMenuItemBody | null
  );
  if (!parsedBody) {
    return NextResponse.json(
      { error: "Invalid menu item payload. Name, description, category, and a non-negative price are required." },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.create({
        data: parsedBody,
      });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.create",
          entityType: "MenuItem",
          entityId: menuItem.id,
          details: JSON.stringify({
            name: menuItem.name,
            category: menuItem.category,
            price: menuItem.price,
            isActive: menuItem.isActive,
            isFeatured: menuItem.isFeatured,
          }),
          actorEmail: auth.session.email,
        },
      });

      return menuItem;
    });

    return NextResponse.json({ menuItem: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create menu item." }, { status: 500 });
  }
}
