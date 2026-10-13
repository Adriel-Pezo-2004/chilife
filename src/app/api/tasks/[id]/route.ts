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
        body.progressPercent < 1 ||
        body.progressPercent > 100
      ) {
        return NextResponse.json({ error: "El porcentaje de la tarea debe ser un entero entre 1 y 100." }, { status: 400 });
      }
      data.progressPercent = body.progressPercent;
    }
    if ("completed" in body) {
      if (typeof body.completed !== "boolean") return NextResponse.json({ error: "El estado de la tarea no es válido." }, { status: 400 });
      data.completed = body.completed;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No se recibieron cambios para guardar." }, { status: 400 });
    }

    if (data.dateKey !== undefined || data.progressPercent !== undefined) {
      const targetDate = data.dateKey ?? task.dateKey;
      const assigned = await prisma.dailyTask.aggregate({
        where: { userId: user.id, dateKey: targetDate, id: { not: task.id } },
        _sum: { progressPercent: true },
      });
      if ((assigned._sum.progressPercent ?? 0) + (data.progressPercent ?? task.progressPercent) > 100) {
        return NextResponse.json({ error: "Los porcentajes asignados a las tareas del día no pueden superar el 100%." }, { status: 400 });
      }
    }

    const updated = await prisma.dailyTask.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Unable to update a daily task:", error);
    return NextResponse.json({ error: "No se pudo actualizar la tarea." }, { status: 503 });
  }
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
