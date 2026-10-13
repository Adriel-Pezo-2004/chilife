import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDateKey } from "@/lib/dates";
import { isCategoryKey } from "@/lib/life";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para consultar tus tareas." }, { status: 401 });

    const dateKey = new URL(request.url).searchParams.get("date");
    if (!isDateKey(dateKey)) return NextResponse.json({ error: "La fecha no es válida." }, { status: 400 });

    const tasks = await prisma.dailyTask.findMany({
      where: { userId: user.id, dateKey },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Unable to load daily tasks:", error);
    return NextResponse.json({ error: "No se pudieron cargar las tareas del día." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para guardar tareas." }, { status: 401 });

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("dateKey" in body) || !isDateKey(body.dateKey)) {
      return NextResponse.json({ error: "La fecha no es válida." }, { status: 400 });
    }
    if (!("categoryKey" in body) || typeof body.categoryKey !== "string" || !isCategoryKey(body.categoryKey)) {
      return NextResponse.json({ error: "Selecciona un área válida." }, { status: 400 });
    }
    if (
      !("description" in body) ||
      typeof body.description !== "string" ||
      body.description.trim().length < 1 ||
      body.description.trim().length > 160
    ) {
      return NextResponse.json({ error: "La descripción debe tener entre 1 y 160 caracteres." }, { status: 400 });
    }
    if (
      !("progressPercent" in body) ||
      typeof body.progressPercent !== "number" ||
      !Number.isInteger(body.progressPercent) ||
      body.progressPercent < 1 ||
      body.progressPercent > 100
    ) {
      return NextResponse.json({ error: "El porcentaje de la tarea debe ser un entero entre 1 y 100." }, { status: 400 });
    }

    const assigned = await prisma.dailyTask.aggregate({
      where: { userId: user.id, dateKey: body.dateKey },
      _sum: { progressPercent: true },
    });
    if ((assigned._sum.progressPercent ?? 0) + body.progressPercent > 100) {
      return NextResponse.json({ error: "Los porcentajes asignados a las tareas del día no pueden superar el 100%." }, { status: 400 });
    }

    const task = await prisma.dailyTask.create({
      data: {
        userId: user.id,
        dateKey: body.dateKey,
        categoryKey: body.categoryKey,
        description: body.description.trim(),
        progressPercent: body.progressPercent,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Unable to create a daily task:", error);
    return NextResponse.json({ error: "No se pudo agregar la tarea." }, { status: 503 });
  }
}
