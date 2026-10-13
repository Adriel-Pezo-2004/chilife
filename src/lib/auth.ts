import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const sessionCookieName = "chilife_session";
const sessionDurationSeconds = 60 * 60 * 24 * 7;

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export function validateAuthConfiguration() {
  signingKey();
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(signingKey());

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_SECRET must contain at least 32 bytes.") {
      throw error;
    }
    return null;
  }
}
