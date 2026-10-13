import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { countFocusedDays } from "@/lib/focus-days";
import { calculateTaskBasedProgress, categoryConfig, type CategoryKey, type DatedDailyTaskProgress } from "@/lib/life";
import { prisma } from "@/lib/prisma";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function findOrCreateMonth(monthKey: string, userId: string) {
  const existing = await prisma.lifeMonth.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
    include: { categories: true },
  });

  const month = existing ?? await prisma.lifeMonth.create({
    data: {
      monthKey,
      userId,
      categories: {
        create: (Object.keys(categoryConfig) as CategoryKey[]).map((key) => ({
          key,
          goal: categoryConfig[key].goal,
          budget: 0,
        })),
      },
    },
    include: { categories: true },
  });

  const monthStart = `${monthKey}-01`;
  const [focusedDays, dailyProgress, tasks] = await Promise.all([
    countFocusedDays(userId, monthKey),
    prisma.dailyAreaProgress.findMany({
      where: { monthId: month.id },
      select: { categoryKey: true, dateKey: true },
    }),
    prisma.dailyTask.findMany({
      where: { userId, dateKey: { gte: monthStart, lt: nextMonthKey(monthKey) } },
      orderBy: { createdAt: "asc" },
      select: { categoryKey: true, dateKey: true, progressPercent: true },
    }),
  ]);

  const recordedDatesByCategory = new Map<string, Set<string>>();
  for (const entry of dailyProgress) {
    const dates = recordedDatesByCategory.get(entry.categoryKey) ?? new Set<string>();
    dates.add(entry.dateKey);
    recordedDatesByCategory.set(entry.categoryKey, dates);
  }

  return {
    ...month,
    categories: month.categories.map((category) => {
      const recordedDates = [...(recordedDatesByCategory.get(category.key) ?? [])];
      if (category.key === "work") return { ...category, progress: focusedDays, recordedDates: [] };
      if (category.key === "exercise" || category.key === "study" || category.key === "nutrition") {
        const recordedDatesForCategory = recordedDatesByCategory.get(category.key) ?? new Set<string>();
        return {
          ...category,
          progress: recordedDates.length + calculateTaskBasedProgress(
            tasks as DatedDailyTaskProgress[],
            category.key,
            recordedDatesForCategory,
          ),
          recordedDates,
        };
      }
      return { ...category, recordedDates };
    }),
  };
}

function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = new Date(year, month, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para consultar tu plan." }, { status: 401 });
    const month = await findOrCreateMonth(currentMonthKey(), user.id);
    return NextResponse.json(month);
  } catch (error) {
    console.error("Unable to load the life plan:", error);
    return NextResponse.json({ error: "No se pudo cargar tu plan. Revisa la conexión con MongoDB." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para consultar tu plan." }, { status: 401 });
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("monthKey" in body) ||
      typeof body.monthKey !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.monthKey)
    ) {
      return NextResponse.json({ error: "El mes indicado no es válido." }, { status: 400 });
    }

    const month = await findOrCreateMonth(body.monthKey, user.id);
    return NextResponse.json(month);
  } catch (error) {
    console.error("Unable to load the requested life plan:", error);
    return NextResponse.json({ error: "No se pudo cargar el plan mensual." }, { status: 503 });
  }
}
