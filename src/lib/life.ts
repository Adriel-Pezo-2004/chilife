export const categoryConfig = {
  exercise: {
    label: "Ejercicio",
    description: "Cuida tu cuerpo, un día a la vez.",
    unit: "sesiones",
    goal: 20,
    icon: "activity",
    color: "mint",
  },
  work: {
    label: "Trabajo",
    description: "Avanza con intención en tus proyectos.",
    unit: "días enfocados",
    goal: 20,
    icon: "briefcase",
    color: "blue",
  },
  study: {
    label: "Estudio",
    description: "Cada sesión es una inversión en ti.",
    unit: "sesiones",
    goal: 16,
    icon: "book",
    color: "lilac",
  },
  nutrition: {
    label: "Alimentación",
    description: "Energía y equilibrio para tu día.",
    unit: "días equilibrados",
    goal: 25,
    icon: "apple",
    color: "peach",
  },
  savings: {
    label: "Ahorro",
    description: "Haz espacio hoy para tus planes de mañana.",
    unit: "ahorrados",
    goal: 5000,
    icon: "piggy",
    color: "yellow",
  },
} as const;

export type CategoryKey = keyof typeof categoryConfig;

export type LifeCategoryData = {
  id: string;
  key: string;
  goal: number;
  progress: number;
  budget: number;
};

export type LifeMonthData = {
  id: string;
  monthKey: string;
  categories: LifeCategoryData[];
};

export function isCategoryKey(value: string): value is CategoryKey {
  return Object.hasOwn(categoryConfig, value);
}

export function categoryPercent(category: Pick<LifeCategoryData, "goal" | "progress">) {
  return category.goal > 0
    ? Math.min(100, Math.round((category.progress / category.goal) * 100))
    : 0;
}

export function lifeBalance(categories: LifeCategoryData[]) {
  if (categories.length === 0 || categories.some((category) => category.goal <= 0 || category.progress <= 0)) {
    return 0;
  }

  const harmonicMean =
    categories.length / categories.reduce((total, category) => total + category.goal / category.progress, 0);

  return Math.min(100, Math.round(harmonicMean * 100));
}

export function rewardTotal(categories: LifeCategoryData[]) {
  return categories.reduce(
    (total, category) => total + (categoryPercent(category) > 80 ? Math.round(category.budget * 0.1) : 0),
    0,
  );
}
