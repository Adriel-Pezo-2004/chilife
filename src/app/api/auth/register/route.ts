import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createSession, validateAuthConfiguration } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    validateAuthConfiguration();
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Completa los datos para crear tu cuenta." }, { status: 400 });
    }

    const { name, email, password } = body as Record<string, unknown>;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: "El nombre debe tener entre 2 y 80 caracteres." }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Escribe un correo electrónico válido." }, { status: 400 });
    }
    if (
      typeof password !== "string" ||
      password.length < 10 ||
      new TextEncoder().encode(password).length > 72
    ) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres y no exceder 72 bytes." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: await hash(password, 12),
      },
      select: { id: true, name: true, email: true },
    });

    try {
      await prisma.lifeMonth.updateMany({
        where: { userId: null },
        data: { userId: user.id },
      });
    } catch (migrationError) {
      console.error("Unable to associate legacy life plans with the first account:", migrationError);
      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json({ error: "No se pudieron asociar los datos existentes. Inténtalo de nuevo." }, { status: 503 });
    }

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo electrónico." }, { status: 409 });
    }
    console.error("Unable to register the account:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta. Revisa la conexión e inténtalo de nuevo." }, { status: 503 });
  }
}
