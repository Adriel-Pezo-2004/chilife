"use client";

import {
  Activity,
  Apple,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Gift,
  Heart,
  LoaderCircle,
  LogOut,
  PiggyBank,
  Plus,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "@/app/auth-screen";
import { DailyTasks, type DailyTask } from "@/app/daily-tasks";
import {
  categoryConfig,
  categoryPercent,
  dailyTaskCompletionPercent,
  dailyTaskProgressAward,
  isCategoryKey,
  lifeBalance,
  rewardTotal,
  type CategoryKey,
  type LifeCategoryData,
  type LifeMonthData,
} from "@/lib/life";

const icons = {
  activity: Activity,
  briefcase: BriefcaseBusiness,
  book: BookOpen,
  apple: Apple,
  piggy: PiggyBank,
};

const colorClasses: Record<string, { card: string; icon: string; bar: string; badge: string }> = {
  mint: { card: "bg-mint-card", icon: "bg-mint-icon text-mint", bar: "bg-mint", badge: "text-mint" },
  blue: { card: "bg-blue-card", icon: "bg-blue-icon text-blue", bar: "bg-blue", badge: "text-blue" },
  lilac: { card: "bg-lilac-card", icon: "bg-lilac-icon text-lilac", bar: "bg-lilac", badge: "text-lilac" },
  peach: { card: "bg-peach-card", icon: "bg-peach-icon text-peach", bar: "bg-peach", badge: "text-peach" },
  yellow: { card: "bg-yellow-card", icon: "bg-yellow-icon text-yellow", bar: "bg-yellow", badge: "text-yellow" },
};

const numberFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const progressFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const money = (amount: number) => `S/ ${numberFormat.format(amount)}`;

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

type YearSummaryData = {
  year: number;
  throughMonth: number;
  categories: LifeCategoryData[];
};

function monthName(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function monthOffset(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function initialMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function initialDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [month, setMonth] = useState<LifeMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearSummary, setYearSummary] = useState<YearSummaryData | null>(null);
  const [yearLoading, setYearLoading] = useState(true);
  const [yearError, setYearError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("500");
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const handleTasksChange = useCallback((tasks: DailyTask[]) => setDailyTasks(tasks), []);
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    setMonthKey(date.slice(0, 7));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          if (response.status !== 401) throw new Error("No se pudo validar tu sesión.");
          return;
        }
        const data = await response.json();
        if (!cancelled) setUser(data.user as AuthenticatedUser);
      } catch (sessionError) {
        if (!cancelled) setError(sessionError instanceof Error ? sessionError.message : "No se pudo validar tu sesión.");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    void loadSession();
    return () => { cancelled = true; };
  }, []);

  const loadMonth = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey: key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el plan.");
      setMonth(data as LifeMonthData);
    } catch (loadError) {
      setMonth(null);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadYearSummary = useCallback(async (key: string) => {
    setYearLoading(true);
    setYearError("");
    try {
      const response = await fetch(`/api/years/${key.slice(0, 4)}?through=${key.slice(5, 7)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el balance anual.");
      setYearSummary(data as YearSummaryData);
    } catch (loadError) {
      setYearSummary(null);
      setYearError(loadError instanceof Error ? loadError.message : "No se pudo cargar el balance anual.");
    } finally {
      setYearLoading(false);
    }
  }, []);

  const handleDailyTaskMutation = useCallback(() => {
    if (user) {
      void loadMonth(monthKey);
      void loadYearSummary(monthKey);
    }
  }, [loadMonth, loadYearSummary, monthKey, user]);

  useEffect(() => {
    if (user) {
      void loadMonth(monthKey);
      void loadYearSummary(monthKey);
    }
  }, [loadMonth, loadYearSummary, monthKey, user]);

  const orderedCategories = useMemo(
    () =>
      Object.keys(categoryConfig)
        .filter(isCategoryKey)
        .map((key) => month?.categories.find((category) => category.key === key))
        .filter((category): category is LifeCategoryData => category !== undefined),
    [month],
  );

  const annualCategories = yearSummary?.categories ?? [];
  const balance = lifeBalance(annualCategories);
  const giftFund = rewardTotal(orderedCategories);
  const monthlyBudget = orderedCategories.reduce(
    (sum, category) => sum + (category.key === "savings" ? 0 : category.budget),
    0,
  );
  const savingsAmountValue = Number(savingsAmount);
  const savingsAmountValid =
    Number.isInteger(savingsAmountValue) && savingsAmountValue >= 1 && savingsAmountValue <= 10000000;
  const monthProgress = orderedCategories.length
    ? Math.round(orderedCategories.reduce((sum, category) => sum + categoryPercent(category), 0) / orderedCategories.length)
    : 0;
  const annualProgress = annualCategories.length
    ? Math.round(annualCategories.reduce((sum, category) => sum + categoryPercent(category), 0) / annualCategories.length)
    : 0;
  const dailyProgress = dailyTaskCompletionPercent(dailyTasks);

  async function updateCategory(
    key: CategoryKey,
    change: { goal?: number; budget?: number; increment?: number; dateKey?: string },
  ) {
    if (!monthKey) return;
    setBusyKey(key);
    setError("");
    try {
      const response = await fetch(`/api/months/${monthKey}/categories/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el cambio.");
      setMonth((current) =>
        current
          ? {
              ...current,
              categories: current.categories.map((category) =>
                category.key === key
                  ? { ...category, ...data, recordedDates: data.recordedDates ?? category.recordedDates }
                  : category,
              ),
            }
          : current,
      );
      void loadYearSummary(monthKey);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo guardar el cambio.");
    } finally {
      setBusyKey(null);
    }
  }

  function saveNumber(key: CategoryKey, field: "goal" | "budget", value: string) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < (field === "budget" ? 0 : 1)) return;
    void updateCategory(key, { [field]: number });
  }

  function changeMonth(offset: number) {
    const nextMonthKey = monthOffset(monthKey, offset);
    const [year, monthNumber] = nextMonthKey.split("-").map(Number);
    const day = Math.min(Number(selectedDate.slice(-2)), new Date(year, monthNumber, 0).getDate());
    const nextDate = `${nextMonthKey}-${String(day).padStart(2, "0")}`;
    setMonthKey(nextMonthKey);
    setSelectedDate(nextDate);
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión.");
      setUser(null);
      setMonth(null);
      setError("");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "No se pudo cerrar la sesión.");
    }
  }

  if (sessionLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas text-muted"><LoaderCircle className="animate-spin" size={25} /></main>;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <main className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#" className="flex items-center gap-3" aria-label="ChiLife inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-ink text-white">
              <Heart size={19} strokeWidth={2.4} fill="currentColor" />
            </span>
            <span className="text-[21px] font-bold tracking-[-0.8px] text-ink">chi<span className="text-mint">life</span></span>
          </a>
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setShowGuide((visible) => !visible)}
              className="hidden items-center gap-2 text-sm font-medium text-muted transition hover:text-ink sm:flex"
            >
              <CircleHelp size={17} /> ¿Cómo funciona?
            </button>
            <span className="h-7 w-px bg-line" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac-card text-[13px] font-bold uppercase text-lilac">{user.name.slice(0, 2)}</div>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-ink sm:block">{user.name}</span>
            </div>
            <button onClick={() => void logout()} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-9 sm:px-8 lg:px-12 lg:pt-12">
        <section className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[1.5px] text-mint">Tu espacio personal</p>
            <h1 className="text-[34px] font-bold leading-tight tracking-[-1.7px] text-ink sm:text-[42px]">Una vida en equilibrio.</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-6 text-muted">Cuida cada parte de tu vida. El progreso real no se trata de hacerlo todo, sino de encontrar tu balance.</p>
          </div>
          <div className="flex h-11 w-fit items-center gap-4 rounded-xl border border-line bg-white px-3 shadow-sm">
            <button onClick={() => changeMonth(-1)} aria-label="Mes anterior" className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink">
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold capitalize text-ink">{monthName(monthKey)}</span>
            <button
              onClick={() => changeMonth(1)}
              disabled={monthKey >= initialMonth()}
              aria-label="Mes siguiente"
              className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {showGuide && (
          <section className="mb-6 rounded-2xl border border-mint/20 bg-mint-card p-5 text-sm leading-6 text-ink sm:p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 shrink-0 text-mint" size={19} />
              <div>
                <h2 className="font-bold">El equilibrio también cuenta</h2>
                <p className="mt-1 text-muted">Tu balance anual usa el promedio armónico del progreso acumulado de las cinco áreas desde enero hasta el mes seleccionado. El dashboard separa el avance diario, mensual y anual. Cada tarea con al menos 80% suma una sesión o día equilibrado; desde 50% y menos de 80%, suma 0.5. Ahorro conserva su propia meta monetaria y no participa en el presupuesto para el regalo.</p>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => { void loadMonth(monthKey); void loadYearSummary(monthKey); }} className="font-semibold underline underline-offset-2">Reintentar</button>
          </div>
        )}

        <section className="mb-7 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="relative overflow-hidden rounded-[22px] bg-ink p-6 text-white sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-14 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-white/65"><Sparkles size={15} /> BALANCE ANUAL DE TU VIDA</p>
                <p className="mt-3 text-[52px] font-bold leading-none tracking-[-2px]">{yearLoading ? "—" : `${balance}%`}</p>
                <p className="mt-3 max-w-xs text-[13px] leading-5 text-white/65">
                  {yearError
                    ? yearError
                    : `Progreso acumulado de enero a ${monthName(monthKey)}: ${yearLoading ? "—" : `${annualProgress}%`}. ${balance >= 80 ? "Vas en equilibrio; sigue cuidando cada área." : "Un paso pequeño en cada área hace la diferencia."}`}
                </p>
              </div>
              <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center self-center sm:mr-3">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-label={`Balance ${balance}%`}>
                  <circle cx="56" cy="56" r="47" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
                  <circle cx="56" cy="56" r="47" fill="none" stroke="#70DEB2" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(balance / 100) * 295.3} 295.3`} className="transition-all duration-700" />
                </svg>
                <Heart className="absolute text-mint" size={24} fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-card text-mint"><Activity size={18} /></span>
              <span className="rounded-full bg-canvas px-2 py-1 text-[10px] font-bold text-muted">DÍA</span>
            </div>
            <p className="mt-4 text-[13px] font-medium text-muted">Progreso diario</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-ink">{dailyTasks.length === 0 ? "0%" : `${progressFormat.format(dailyProgress)}%`}</p>
            <p className="mt-1 text-[11px] text-muted">{dailyTasks.filter((task) => task.completed).length} de {dailyTasks.length} tareas al 80% · {selectedDate}</p>
          </div>
          <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lilac-card text-lilac"><ArrowUpRight size={18} /></span>
              <span className="rounded-full bg-canvas px-2 py-1 text-[10px] font-bold text-muted">MES</span>
            </div>
            <p className="mt-4 text-[13px] font-medium text-muted">Progreso mensual</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-ink">{loading ? "—" : `${monthProgress}%`}</p>
            <p className="mt-1 text-[11px] text-muted">{monthName(monthKey)} · {money(monthlyBudget)} presupuestados</p>
          </div>
          <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-card text-yellow"><ArrowUpRight size={18} /></span>
              <span className="rounded-full bg-canvas px-2 py-1 text-[10px] font-bold text-muted">AÑO</span>
            </div>
            <p className="mt-4 text-[13px] font-medium text-muted">Progreso anual</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-ink">{yearLoading ? "—" : `${annualProgress}%`}</p>
            <p className="mt-1 text-[11px] text-muted">Enero – {monthName(monthKey)}</p>
          </div>
        </section>

        <DailyTasks
          key={user.id}
          onTasksChange={handleTasksChange}
          onDateChange={handleDateChange}
          onTaskMutation={handleDailyTaskMutation}
        />

        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold tracking-[-0.5px] text-ink">Tus cinco áreas</h2>
              <p className="mt-1 text-[13px] text-muted">Cada tarea diaria aporta según cuánto completaste.</p>
            </div>
            <span className="hidden text-[12px] text-muted sm:block">Elige una meta que se sienta posible.</span>
          </div>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-line bg-white text-muted"><LoaderCircle className="animate-spin" size={23} /></div>
          ) : month ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {orderedCategories.map((category) => {
                const key = category.key as CategoryKey;
                const config = categoryConfig[key];
                const colors = colorClasses[config.color];
                const Icon = icons[config.icon];
                const percent = categoryPercent(category);
                const unlocked = key !== "savings" && percent > 80;
                const savingsGoalMet = key === "savings" && category.progress >= category.goal;
                const busy = busyKey === key;
                const areaTasks = dailyTasks.filter(
                  (task) => task.dateKey === selectedDate && task.categoryKey === key,
                );
                const completedToday = dailyTaskCompletionPercent(areaTasks);
                const dailyAward = areaTasks.reduce(
                  (total, task) => total + dailyTaskProgressAward(task.progressPercent),
                  0,
                );
                const dailyAwardUnit = key === "nutrition"
                  ? dailyAward > 1 ? "días equilibrados" : "día equilibrado"
                  : dailyAward > 1 ? "sesiones" : "sesión";
                return (
                  <article key={category.id} className="rounded-[20px] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-card sm:p-6">
                    <div className="flex items-start justify-between">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${colors.icon}`}><Icon size={20} strokeWidth={1.9} /></span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${unlocked ? "bg-mint-card text-mint" : "bg-canvas text-muted"}`}>
                        {unlocked
                          ? <span className="flex items-center gap-1"><Check size={12} /> Premio activo</span>
                          : savingsGoalMet
                            ? <span className="flex items-center gap-1"><Check size={12} /> Meta alcanzada</span>
                            : `${percent}% completado`}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[17px] font-bold text-ink">{config.label}</h3>
                    <p className="mt-1 min-h-[34px] text-[12px] leading-[18px] text-muted">{config.description}</p>

                    <div className="mt-5 flex items-end justify-between">
                      <p className="text-[27px] font-bold leading-none tracking-[-1px] text-ink">
                        {key === "savings" ? money(category.progress) : progressFormat.format(category.progress)}
                        <span className="ml-1.5 text-[12px] font-medium tracking-normal text-muted">/ {key === "savings" ? money(category.goal) : category.goal}</span>
                      </p>
                      <span className="pb-0.5 text-[11px] text-muted">{config.unit}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${percent}%` }} />
                    </div>

                    <div className={`mt-4 rounded-xl px-3 py-3 ${colors.card}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted">Completitud promedio de hoy · {progressFormat.format(completedToday)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                        <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${completedToday}%` }} />
                      </div>
                      {areaTasks.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {areaTasks.slice(0, 2).map((task) => (
                            <li key={task.id} className="flex items-center justify-between gap-2 text-[10px]">
                              <span className={`min-w-0 truncate ${task.completed ? "text-muted line-through" : "text-ink"}`}>{task.completed ? "✓ " : ""}{task.description}</span>
                              <span className="shrink-0 font-semibold text-muted">{task.progressPercent}%</span>
                            </li>
                          ))}
                          {areaTasks.length > 2 && <li className="text-[10px] text-muted">y {areaTasks.length - 2} tareas más en tu avance diario</li>}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[10px] text-muted">Aún no hay tareas de {config.label.toLowerCase()} para este día.</p>
                      )}
                    </div>

                    {key !== "savings" && (
                      <div className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 ${colors.card}`}>
                        <div className="flex items-center gap-2">
                          <Gift size={15} className={colors.badge} />
                          <span className="text-[11px] font-medium text-muted">{unlocked ? "Aporta al regalo" : "Al llegar al 81%"}</span>
                        </div>
                        <strong className="text-[12px] text-ink">{unlocked ? money(Math.round(category.budget * 0.1)) : `+${money(Math.round(category.budget * 0.1))}`}</strong>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <div>
                        <label htmlFor={`goal-${key}`} className="block text-[10px] font-medium text-muted">META MENSUAL</label>
                        <div className="mt-1 flex items-center gap-1">
                          {key === "savings" && <span className="text-[12px] font-semibold text-muted">S/</span>}
                          <input
                            id={`goal-${key}`}
                            aria-label={`Meta mensual de ${config.label}`}
                            type="number"
                            min="1"
                            max={key === "savings" ? "10000000" : "10000"}
                            defaultValue={category.goal}
                            key={`${key}-goal-${category.goal}`}
                            onBlur={(event) => saveNumber(key, "goal", event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                            className="w-16 border-0 bg-transparent p-0 text-[13px] font-semibold text-ink outline-none focus:ring-0"
                          />
                        </div>
                      </div>
                      {key !== "savings" && (
                        <div className="text-right">
                          <label htmlFor={`budget-${key}`} className="block text-[10px] font-medium text-muted">PRESUPUESTO</label>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="text-[12px] font-semibold text-muted">S/</span>
                            <input
                              id={`budget-${key}`}
                              aria-label={`Presupuesto de ${config.label}`}
                              type="number"
                              min="0"
                              max="100000000"
                              defaultValue={category.budget}
                              key={`${key}-budget-${category.budget}`}
                              onBlur={(event) => saveNumber(key, "budget", event.target.value)}
                              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                              className="w-[76px] border-0 bg-transparent p-0 text-right text-[13px] font-semibold text-ink outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {key === "work" ? (
                        <p className="flex h-10 flex-1 items-center justify-center rounded-xl bg-blue-card px-2 text-center text-[11px] font-semibold text-blue">
                          Sube al completar cualquier tarea del día
                        </p>
                      ) : key === "savings" ? (
                        <label className="flex h-10 min-w-0 items-center gap-1.5 rounded-xl border border-line px-2.5">
                          <span className="text-[12px] font-semibold text-muted">S/</span>
                          <input
                            aria-label="Monto de ahorro a registrar"
                            type="number"
                            min="1"
                            max="10000000"
                            value={savingsAmount}
                            onChange={(event) => setSavingsAmount(event.target.value)}
                            className="w-[68px] min-w-0 border-0 bg-transparent p-0 text-[12px] font-semibold text-ink outline-none focus:ring-0"
                          />
                        </label>
                      ) : (
                        <p className="flex h-10 flex-1 items-center justify-center rounded-xl bg-canvas px-2 text-center text-[11px] font-semibold text-muted">
                          {dailyAward > 0
                            ? `Hoy suma ${progressFormat.format(dailyAward)} ${dailyAwardUnit}`
                            : areaTasks.length > 0
                              ? "Desde 50% suma 0.5"
                              : "El avance se calcula con tus tareas"}
                        </p>
                      )}
                      {key === "savings" && (
                        <button
                          disabled={
                            busy ||
                            !savingsAmountValid
                          }
                          onClick={() =>
                            void updateCategory(key, { increment: savingsAmountValue })
                          }
                          className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted ${unlocked ? "bg-mint-card text-mint hover:bg-mint/15" : "bg-ink text-white hover:bg-ink/90"}`}
                        >
                          {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={15} />}
                          {busy ? "Guardando..." : "Registrar ahorro"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-10 text-center">
              <p className="font-semibold text-ink">No pudimos mostrar tu plan.</p>
              <button onClick={() => void loadMonth(monthKey)} className="mt-3 text-sm font-semibold text-mint underline underline-offset-2">Volver a intentar</button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[22px] border border-line bg-white">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="p-6 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-card text-yellow"><Gift size={19} /></span>
              <h2 className="mt-4 text-[18px] font-bold text-ink">Un regalo que te ganas tú.</h2>
              <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted">Cada área con presupuesto que supera el 80% suma su recompensa. El ahorro se registra por separado y no forma parte del presupuesto para el regalo.</p>
            </div>
            <div className="flex items-center gap-4 border-t border-line p-6 md:border-l md:border-t-0 sm:p-7">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-muted"><ArrowDownRight size={18} /></span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted">Tu esfuerzo</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">Supera el 80% de una meta con presupuesto</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-line p-6 md:border-l md:border-t-0 sm:p-7">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-card text-mint"><ArrowUpRight size={18} /></span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted">Tu recompensa</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">10% del presupuesto al regalo</p>
              </div>
            </div>
          </div>
        </section>
        <footer className="mt-8 flex flex-col items-center justify-between gap-2 text-[11px] text-muted sm:flex-row">
          <p>Hecho para vivir mejor, no para vivir corriendo. <Heart className="inline text-peach" size={12} fill="currentColor" /></p>
          <p>{money(giftFund)} para tu próximo regalo</p>
        </footer>
      </div>
    </main>
  );
}
