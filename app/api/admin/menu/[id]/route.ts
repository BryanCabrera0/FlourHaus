import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { enforceMenuItemVariantRules, isCookieCategory } from "@/lib/menuItemVariantRules";

export const runtime = "nodejs";

type UpdateMenuItemBody = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  isFeatured?: unknown;
  featuredSortOrder?: unknown;
  cookiePackPrices?: unknown;
};

function normalizeOptionalImageUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Allow local/static paths (ex: /uploads/menu-images/foo.jpg).
  // Reject protocol-relative URLs (//example.com) which can bypass URL parsing.
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? undefined : trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function parseUpdateBody(body: UpdateMenuItemBody | null) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  const cookiePackPrices = (() => {
    if (body.cookiePackPrices === undefined) {
      return undefined;
    }
    if (typeof body.cookiePackPrices !== "object" || body.cookiePackPrices === null || Array.isArray(body.cookiePackPrices)) {
      return null;
    }

    const input = body.cookiePackPrices as Record<string, unknown>;
    const presets = [4, 8, 12] as const;
    const output: Partial<Record<(typeof presets)[number], number>> = {};

    for (const preset of presets) {
      if (!(String(preset) in input)) {
        continue;
      }
      const raw = input[String(preset)];
      const parsed = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
      }
      output[preset] = parsed;
    }

    return Object.keys(output).length > 0 ? output : null;
  })();

  if (cookiePackPrices === null) {
    return null;
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return null;
    }
    updateData.name = name;
  }

  if (typeof body.description === "string") {
    const description = body.description.trim();
    if (!description) {
      return null;
    }
    updateData.description = description;
  }

  if (typeof body.category === "string") {
    const category = body.category.trim();
    if (!category) {
      return null;
    }
    updateData.category = category;
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

  if (body.featuredSortOrder !== undefined) {
    const featuredSortOrder =
      typeof body.featuredSortOrder === "number"
        ? body.featuredSortOrder
        : Number(body.featuredSortOrder);
    if (!Number.isInteger(featuredSortOrder)) {
      return null;
    }
    updateData.featuredSortOrder = featuredSortOrder;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return null;
    }
    updateData.isActive = body.isActive;
  }

  if (body.isFeatured !== undefined) {
    if (typeof body.isFeatured !== "boolean") {
      return null;
    }
    updateData.isFeatured = body.isFeatured;
  }

  if (body.imageUrl !== undefined) {
    const imageUrl = normalizeOptionalImageUrl(body.imageUrl);
    if (imageUrl === undefined) {
      return null;
    }
    updateData.imageUrl = imageUrl;
  }

  if (Object.keys(updateData).length === 0 && cookiePackPrices === undefined) {
    return null;
  }

  return {
    updateData,
    cookiePackPrices,
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
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
    return NextResponse.json({ error: "Invalid menu item id." }, { status: 400 });
  }

  const updateData = parseUpdateBody(
    (await request.json().catch(() => null)) as UpdateMenuItemBody | null
  );
  if (!updateData) {
    return NextResponse.json({ error: "Invalid menu item update payload." }, { status: 400 });
  }

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
  }

  const nextCategory =
    typeof updateData.updateData.category === "string"
      ? (updateData.updateData.category as string)
      : existing.category;
  const nextIsCookie = isCookieCategory(nextCategory);
  const wasCookie = isCookieCategory(existing.category);

  const nextUpdateData = { ...updateData.updateData } as Record<string, unknown>;
  const nextCookiePackPrices = updateData.cookiePackPrices;

  if (!nextIsCookie && nextCookiePackPrices !== undefined) {
    return NextResponse.json(
      { error: "Cookie pack prices can only be set for cookie items." },
      { status: 400 },
    );
  }

  if (nextIsCookie) {
    if (nextCookiePackPrices === undefined) {
      // If an item is being switched into the Cookies category, require variant pricing.
      if (!wasCookie) {
        return NextResponse.json(
          { error: "Cookie items require pack prices for 4/8/12." },
          { status: 400 },
        );
      }

      // Never allow updating the cookie base price directly; it's derived from pack pricing.
      if ("price" in nextUpdateData) {
        delete nextUpdateData.price;
      }
    } else {
      const requiredPresets = [4, 8, 12] as const;
      for (const preset of requiredPresets) {
        if (nextCookiePackPrices[preset] === undefined) {
          return NextResponse.json(
            { error: "Cookie items require pack prices for 4/8/12." },
            { status: 400 },
          );
        }
      }

      const price4 = nextCookiePackPrices[4] as number;
      nextUpdateData.price = roundCurrency(price4 / 4);
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existingTx = await tx.menuItem.findUnique({ where: { id } });
      if (!existingTx) {
        return null;
      }

      const hasMenuItemUpdates = Object.keys(nextUpdateData).length > 0;
      const menuItem = hasMenuItemUpdates
        ? await tx.menuItem.update({
            where: { id },
            data: nextUpdateData,
          })
        : existingTx;

      await enforceMenuItemVariantRules(tx, {
        menuItemId: id,
        category: menuItem.category,
        basePrice: menuItem.price,
        cookiePackPrices: nextCookiePackPrices,
      });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.update",
          entityType: "MenuItem",
          entityId: id,
          details: JSON.stringify({
            before: {
              name: existingTx.name,
              description: existingTx.description,
              price: existingTx.price,
              category: existingTx.category,
              imageUrl: existingTx.imageUrl,
              isActive: existingTx.isActive,
              sortOrder: existingTx.sortOrder,
            },
            after: {
              ...nextUpdateData,
              ...(nextCookiePackPrices ? { cookiePackPrices: nextCookiePackPrices } : {}),
            },
          }),
          actorEmail: auth.session.email,
        },
      });

      const refreshed = await tx.menuItem.findUnique({
        where: { id },
        include: {
          variants: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      });

      return refreshed;
    });

    if (!updated) {
      return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    }

    return NextResponse.json({ menuItem: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update menu item." }, { status: 500 });
  }
}

export async function DELETE(
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
    return NextResponse.json({ error: "Invalid menu item id." }, { status: 400 });
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItem.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }

      await tx.menuItem.delete({ where: { id } });

      await tx.adminAuditLog.create({
        data: {
          action: "menu.delete",
          entityType: "MenuItem",
          entityId: id,
          details: JSON.stringify({
            name: existing.name,
            category: existing.category,
            price: existing.price,
          }),
          actorEmail: auth.session.email,
        },
      });

      return existing;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete menu item." }, { status: 500 });
  }
}
