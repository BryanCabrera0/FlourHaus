import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { requireAdminSession } from "@/lib/adminApi";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function resolveFileExtension(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  if (mimeType === "image/gif") {
    return ".gif";
  }

  const extension = path.extname(file.name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension) ? extension : null;
}

function sanitizeName(name: string): string {
  const basename = path.basename(name, path.extname(name));
  const cleaned = basename
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "image";
}

function createUploadFileName(file: File, extension: string): string {
  return `${Date.now()}-${randomUUID()}-${sanitizeName(file.name)}${extension}`;
}

async function uploadToLocalDisk(file: File, fileName: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "menu-images");
  await mkdir(uploadDir, { recursive: true });
  const destinationPath = path.join(uploadDir, fileName);

  await writeFile(destinationPath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/menu-images/${fileName}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 },
    );
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    );
  }

  const extension = resolveFileExtension(file);
  if (!extension) {
    return NextResponse.json(
      { error: "File type not allowed. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 400 },
    );
  }

  const fileName = createUploadFileName(file, extension);
  const blobToken =
    process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

  try {
    if (blobToken) {
      const blob = await put(`menu-images/${fileName}`, file, {
        access: "public",
        token: blobToken,
      });
      return NextResponse.json({ url: blob.url });
    }

    const localUrl = await uploadToLocalDisk(file, fileName);
    return NextResponse.json({ url: localUrl });
  } catch (error) {
    const details =
      error instanceof Error && error.message
        ? ` ${error.message}`
        : "";

    return NextResponse.json(
      {
        error: `Failed to upload image.${details} Configure BLOB_READ_WRITE_TOKEN for hosted storage if local disk writes are unavailable.`,
      },
      { status: 500 },
    );
  }
}
