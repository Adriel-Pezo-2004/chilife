import { prisma } from "@/lib/prisma";

export async function countFocusedDays(userId: string, monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = new Date(year, month, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const dates = await prisma.dailyTask.findMany({
    where: {
      userId,
      categoryKey: "work",
      completed: true,
      dateKey: { gte: `${monthKey}-01`, lt: nextMonthKey },
    },
    select: { dateKey: true },
    distinct: ["dateKey"],
  });

  return dates.length;
}
