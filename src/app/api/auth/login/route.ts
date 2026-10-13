import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { createSession, validateAuthConfiguration } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    validateAuthConfiguration();
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      typeof body.email !== "string" ||
      !("password" in body) ||
      typeof body.password !== "string" ||
      body.password.length > 72 ||
      body.email.length > 254
    ) {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Unable to sign in:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión. Inténtalo de nuevo." }, { status: 503 });
  }
}
