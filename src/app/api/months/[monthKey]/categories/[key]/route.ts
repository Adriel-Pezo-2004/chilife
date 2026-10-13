import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { countFocusedDays } from "@/lib/focus-days";
import { isCategoryKey } from "@/lib/life";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ monthKey: string; key: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { monthKey, key } = await context.params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) || !isCategoryKey(key)) {
    return NextResponse.json({ error: "El mes o área indicada no es válida." }, { status: 400 });
  }

  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para actualizar tu plan." }, { status: 401 });
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    }

    const data: { goal?: number; budget?: number; progress?: { increment: number } } = {};
    if ("goal" in body) {
      const maxGoal = key === "savings" ? 10000000 : 10000;
      if (typeof body.goal !== "number" || !Number.isInteger(body.goal) || body.goal < 1 || body.goal > maxGoal) {
        return NextResponse.json({ error: `La meta debe ser un número entero entre 1 y ${maxGoal.toLocaleString("es")}.` }, { status: 400 });
      }
      data.goal = body.goal;
    }
    if ("budget" in body) {
      if (typeof body.budget !== "number" || !Number.isInteger(body.budget) || body.budget < 0 || body.budget > 100000000) {
        return NextResponse.json({ error: "El presupuesto debe ser un monto entero positivo." }, { status: 400 });
      }
      data.budget = body.budget;
    }
    if ("increment" in body) {
      if (key === "work") {
        return NextResponse.json({ error: "Los días enfocados se registran al completar tareas del área Trabajo." }, { status: 400 });
      }
      if (
        typeof body.increment !== "number" ||
        !Number.isInteger(body.increment) ||
        body.increment < 1 ||
        body.increment > 10000000
      ) {
        return NextResponse.json({ error: "El avance debe ser un número entero entre 1 y 10,000,000." }, { status: 400 });
      }
      data.progress = { increment: body.increment };
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No se recibieron cambios para guardar." }, { status: 400 });
    }

    const month = await prisma.lifeMonth.findUnique({
      where: { userId_monthKey: { userId: user.id, monthKey } },
      select: { id: true },
    });
    if (!month) return NextResponse.json({ error: "No se encontró el plan mensual." }, { status: 404 });

    const category = await prisma.lifeCategory.update({
      where: { monthId_key: { monthId: month.id, key } },
      data,
    });
    if (key === "work") {
      return NextResponse.json({
        ...category,
        progress: await countFocusedDays(user.id, monthKey),
      });
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Unable to update a life category:", error);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 503 });
  }
}
