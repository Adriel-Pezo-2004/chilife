import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  calculateTaskBasedProgress,
  categoryConfig,
  type CategoryKey,
  type DatedDailyTaskProgress,
  type LifeCategoryData,
} from "@/lib/life";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ year: string }>;
};

function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = new Date(year, month, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(request: Request, context: RouteContext) {
  const { year } = await context.params;
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "El año indicado no es válido." }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const throughParam = new URL(request.url).searchParams.get("through");
  const throughMonth = throughParam === null
    ? year === String(currentYear) ? currentMonth : 12
    : Number(throughParam);
  if (!Number.isInteger(throughMonth) || throughMonth < 1 || throughMonth > 12) {
    return NextResponse.json({ error: "El mes de corte no es válido." }, { status: 400 });
  }
  if (Number(year) > currentYear || (Number(year) === currentYear && throughMonth > currentMonth)) {
    return NextResponse.json({ error: "No se puede consultar un período futuro." }, { status: 400 });
  }

  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para consultar tu balance anual." }, { status: 401 });

    const throughMonthKey = `${year}-${String(throughMonth).padStart(2, "0")}`;
    const endDate = nextMonthKey(throughMonthKey);
    const [months, tasks] = await Promise.all([
      prisma.lifeMonth.findMany({
        where: { userId: user.id, monthKey: { gte: `${year}-01`, lte: throughMonthKey } },
        include: {
          categories: true,
          dailyProgress: { select: { categoryKey: true, dateKey: true } },
        },
      }),
      prisma.dailyTask.findMany({
        where: { userId: user.id, dateKey: { gte: `${year}-01-01`, lt: endDate } },
        select: { categoryKey: true, dateKey: true, progressPercent: true },
      }),
    ]);

    const monthByKey = new Map(months.map((month) => [month.monthKey, month]));
    const taskProgress = tasks as DatedDailyTaskProgress[];
    const categories: LifeCategoryData[] = (Object.keys(categoryConfig) as CategoryKey[]).map((key) => {
      let goal = 0;
      let progress = 0;

      for (let monthNumber = 1; monthNumber <= throughMonth; monthNumber += 1) {
        const monthKey = `${year}-${String(monthNumber).padStart(2, "0")}`;
        const month = monthByKey.get(monthKey);
        const monthCategory = month?.categories.find((category) => category.key === key);
        const monthGoal = monthCategory?.goal ?? categoryConfig[key].goal;
        goal += monthGoal;
        const monthTasks = taskProgress.filter((task) => task.dateKey.startsWith(`${monthKey}-`));

        if (key === "savings") {
          progress += monthCategory?.progress ?? 0;
          continue;
        }

        const recordedDates = new Set(
          month?.dailyProgress
            .filter((entry) => entry.categoryKey === key)
            .map((entry) => entry.dateKey) ?? [],
        );
        if (key === "work") {
          const focusedDates = new Set(
            monthTasks
              .filter((task) => task.progressPercent >= 80)
              .map((task) => task.dateKey),
          );
          progress += focusedDates.size;
        } else {
          progress += recordedDates.size + calculateTaskBasedProgress(monthTasks, key, recordedDates);
        }
      }

      return { id: key, key, goal, progress, budget: 0 };
    });

    return NextResponse.json({ year: Number(year), throughMonth, categories });
  } catch (error) {
    console.error("Unable to load annual life progress:", error);
    return NextResponse.json({ error: "No se pudo cargar el balance anual." }, { status: 503 });
  }
}
