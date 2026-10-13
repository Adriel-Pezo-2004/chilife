import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDateKey } from "@/lib/dates";
import { isCategoryKey } from "@/lib/life";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para editar tareas." }, { status: 401 });

    const { id } = await context.params;
    const task = await prisma.dailyTask.findFirst({ where: { id, userId: user.id } });
    if (!task) return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    }

    const data: { description?: string; categoryKey?: string; dateKey?: string; progressPercent?: number; completed?: boolean } = {};
    if ("description" in body) {
      if (typeof body.description !== "string" || body.description.trim().length < 1 || body.description.trim().length > 160) {
        return NextResponse.json({ error: "La descripción debe tener entre 1 y 160 caracteres." }, { status: 400 });
      }
      data.description = body.description.trim();
    }
    if ("categoryKey" in body) {
      if (typeof body.categoryKey !== "string" || !isCategoryKey(body.categoryKey)) {
        return NextResponse.json({ error: "Selecciona un área válida." }, { status: 400 });
      }
      data.categoryKey = body.categoryKey;
    }
    if ("dateKey" in body) {
      if (!isDateKey(body.dateKey)) return NextResponse.json({ error: "La fecha no es válida." }, { status: 400 });
      data.dateKey = body.dateKey;
    }
    if ("progressPercent" in body) {
      if (
        typeof body.progressPercent !== "number" ||
        !Number.isInteger(body.progressPercent) ||
        body.progressPercent < 0 ||
        body.progressPercent > 100
      ) {
        return NextResponse.json({ error: "El porcentaje completado debe ser un entero entre 0 y 100." }, { status: 400 });
      }
      data.progressPercent = body.progressPercent;
      data.completed = body.progressPercent >= 80;
    }
    if ("completed" in body) {
      if (typeof body.completed !== "boolean") return NextResponse.json({ error: "El estado de la tarea no es válido." }, { status: 400 });
      data.completed = body.completed;
      if (!("progressPercent" in body)) data.progressPercent = body.completed ? 100 : 0;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No se recibieron cambios para guardar." }, { status: 400 });
    }

    if (data.dateKey !== undefined && data.dateKey !== task.dateKey) {
      const taskOnDate = await prisma.dailyTask.findFirst({
        where: { userId: user.id, dateKey: data.dateKey, id: { not: task.id } },
        select: { id: true },
      });
      if (taskOnDate) {
        return NextResponse.json({ error: "Ya existe una tarea para ese día. Elimina la otra tarea antes de cambiar la fecha." }, { status: 409 });
      }
    }

    let updated;
    try {
      updated = await prisma.dailyTask.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ error: "Ya existe una tarea para ese día." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ ...updated, completed: updated.progressPercent >= 80 });
  } catch (error) {
    console.error("Unable to update a daily task:", error);
    return NextResponse.json({ error: "No se pudo actualizar la tarea." }, { status: 503 });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para eliminar tareas." }, { status: 401 });

    const { id } = await context.params;
    const result = await prisma.dailyTask.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete a daily task:", error);
    return NextResponse.json({ error: "No se pudo eliminar la tarea." }, { status: 503 });
  }
}
