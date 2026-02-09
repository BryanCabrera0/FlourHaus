import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { normalizePgConnectionString } from "../lib/normalizePgConnectionString";

type MenuItemRow = {
  id: number;
  name: string;
  imageUrl: string | null;
};

function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
}

function getLocalPathFromImageUrl(imageUrl: string): { fileName: string; diskPath: string } | null {
  if (!imageUrl.startsWith("/uploads/menu-images/")) {
    return null;
  }

  const fileName = imageUrl.split("/").pop();
  if (!fileName) {
    return null;
  }

  // imageUrl is a URL path (leading slash). Convert to a relative path inside /public.
  const rel = imageUrl.replace(/^\//, "");
  const diskPath = path.join(process.cwd(), "public", rel);

  return { fileName, diskPath };
}

async function main() {
  const blobToken = getBlobToken();
  if (!blobToken) {
    throw new Error(
      "Missing BLOB_READ_WRITE_TOKEN. Run this script with Vercel env vars (ex: `vercel env run -e production -- npx tsx scripts/migrate-menu-images-to-blob.ts`).",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  const adapter = new PrismaPg({
    connectionString: normalizePgConnectionString(databaseUrl),
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const items = await prisma.menuItem.findMany({
      select: { id: true, name: true, imageUrl: true },
      orderBy: { id: "asc" },
    }) as MenuItemRow[];

    const candidates = items
      .map((item) => {
        if (!item.imageUrl) return null;
        const local = getLocalPathFromImageUrl(item.imageUrl);
        if (!local) return null;
        return { ...item, ...local };
      })
      .filter(Boolean) as Array<MenuItemRow & { fileName: string; diskPath: string }>;

    if (candidates.length === 0) {
      console.log("No menu items reference /uploads/menu-images/. Nothing to migrate.");
      return;
    }

    console.log(`Found ${candidates.length} menu item(s) with local upload paths. Migrating to Vercel Blob...`);

    let migrated = 0;
    let skippedMissing = 0;

    for (const item of candidates) {
      if (!existsSync(item.diskPath)) {
        skippedMissing += 1;
        console.log(`- Missing file for item #${item.id} (${item.name}): ${item.diskPath}`);
        continue;
      }

      const buffer = await readFile(item.diskPath);
      const blob = await put(`menu-images/${item.fileName}`, buffer, {
        access: "public",
        token: blobToken,
      });

      await prisma.menuItem.update({
        where: { id: item.id },
        data: { imageUrl: blob.url },
      });

      migrated += 1;
      console.log(`- Migrated item #${item.id} (${item.name}) -> ${blob.pathname}`);
    }

    console.log(`Done. Migrated: ${migrated}. Missing local files: ${skippedMissing}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

