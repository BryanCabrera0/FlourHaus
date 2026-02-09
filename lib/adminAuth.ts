import "server-only";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from "./adminSession";
import { verifyAdminPassword } from "./adminPassword";

type RequiredAdminEnv = {
  adminEmail: string;
  adminPasswordHash: string;
  sessionSecret: string;
};

function readAdminEnv(): RequiredAdminEnv | null {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!adminEmail || !adminPasswordHash || !sessionSecret) {
    return null;
  }

  return {
    adminEmail,
    adminPasswordHash,
    sessionSecret,
  };
}

export function isAdminAuthConfigured(): boolean {
  return readAdminEnv() !== null;
}

export async function authenticateAdminCredentials(
  email: string,
  password: string
): Promise<{ ok: true; normalizedEmail: string } | { ok: false }> {
  const env = readAdminEnv();
  if (!env) {
    return { ok: false };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== env.adminEmail) {
    return { ok: false };
  }

  if (!verifyAdminPassword(password, env.adminPasswordHash)) {
    return { ok: false };
  }

  return { ok: true, normalizedEmail };
}

export async function createAdminSessionCookieValue(email: string): Promise<string | null> {
  const env = readAdminEnv();
  if (!env) {
    return null;
  }

  return createAdminSessionToken(email, env.sessionSecret, ADMIN_SESSION_MAX_AGE_SECONDS);
}

export async function getAdminSessionFromRequest(
  request: NextRequest
): Promise<AdminSessionPayload | null> {
  const env = readAdminEnv();
  if (!env) {
    return null;
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token, env.sessionSecret);
}

export async function getAdminSessionFromCookieStore(): Promise<AdminSessionPayload | null> {
  const env = readAdminEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token, env.sessionSecret);
}
