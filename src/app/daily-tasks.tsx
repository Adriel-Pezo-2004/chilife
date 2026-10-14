"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { categoryConfig, dailyTaskCompletionPercent, isCategoryKey, type CategoryKey } from "@/lib/life";

export type DailyTask = {
  id: string;
  dateKey: string;
  categoryKey: string;
  description: string;
  progressPercent: number;
  completed: boolean;
};

type TaskDraft = {
  description: string;
  categoryKey: CategoryKey;
  dateKey: string;
  progressPercent: string;
};

type DailyTasksProps = {
  onTasksChange: (tasks: DailyTask[]) => void;
  onDateChange: (dateKey: string) => void;
  onTaskMutation: () => void;
};

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function moveDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount);
  return localDateKey(date);
}

function readableDate(dateKey: string) {
  const today = localDateKey();
  if (dateKey === today) return "Hoy";
  if (dateKey === moveDate(today, -1)) return "Ayer";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
}

const blankDraft = (dateKey: string): TaskDraft => ({
  description: "",
  categoryKey: "exercise",
  dateKey,
  progressPercent: "0",
});

export function DailyTasks({ onTasksChange, onDateChange, onTaskMutation }: DailyTasksProps) {
  const [dateKey, setDateKey] = useState(localDateKey);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [draft, setDraft] = useState<TaskDraft>(() => blankDraft(localDateKey()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async (date: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks?date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las tareas.");
      setTasks(data as DailyTask[]);
    } catch (loadError) {
      setTasks([]);
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks(dateKey);
  }, [dateKey, loadTasks]);

  useEffect(() => {
    onTasksChange(tasks);
  }, [onTasksChange, tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed)),
    [tasks],
  );

  function changeDate(nextDate: string) {
    setDateKey(nextDate);
    onDateChange(nextDate);
    setDraft(blankDraft(nextDate));
    setEditingId(null);
    setDeletingId(null);
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = draft.description.trim();
    const progressPercent = Number(draft.progressPercent);
    if (
      !description ||
      description.length > 160 ||
      !Number.isInteger(progressPercent) ||
      progressPercent < 0 ||
      progressPercent > 100
    ) return;

    setSaving(true);
    setError("");
    try {
      const editing = editingId !== null;
      const response = await fetch(editing ? `/api/tasks/${editingId}` : "/api/tasks", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          categoryKey: draft.categoryKey,
          dateKey: draft.dateKey,
          progressPercent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la tarea.");

      const updatedDate = data.dateKey as string;
      if (editing) {
        setTasks((current) => current.filter((task) => task.id !== editingId && task.dateKey === dateKey).concat(
          updatedDate === dateKey ? [data as DailyTask] : [],
        ));
        setEditingId(null);
        if (updatedDate !== dateKey) {
          setDateKey(updatedDate);
          onDateChange(updatedDate);
        }
      } else if (updatedDate === dateKey) {
        setTasks((current) => [...current, data as DailyTask]);
      } else {
        setDateKey(updatedDate);
      }
      setDraft(blankDraft(updatedDate));
      onTaskMutation();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(task: DailyTask) {
    if (!isCategoryKey(task.categoryKey)) return;
    setEditingId(task.id);
    setDeletingId(null);
    setDraft({
      description: task.description,
      categoryKey: task.categoryKey,
      dateKey: task.dateKey,
      progressPercent: String(task.progressPercent),
    });
  }

  async function saveTaskProgress(task: DailyTask, progressPercent: number) {
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar la tarea.");
      setTasks((current) => current.map((item) => (item.id === task.id ? data as DailyTask : item)));
      onTaskMutation();
    } catch (updateError) {
      setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la tarea.");
    }
  }

  async function deleteTask(taskId: string) {
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar la tarea.");
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setDeletingId(null);
      onTaskMutation();
      if (editingId === taskId) {
        setEditingId(null);
        setDraft(blankDraft(dateKey));
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la tarea.");
    }
  }

  return (
    <section className="mb-10 rounded-[22px] border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[1.3px] text-mint"><CalendarDays size={15} /> Tu día, a tu ritmo</p>
          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.7px] text-ink">Avance del día</h2>
          <p className="mt-1 text-[13px] text-muted">Agrega varias tareas al día, en una o más áreas, y registra cuánto completaste de cada una.</p>
        </div>
        <div className="flex w-fit items-center gap-3 rounded-xl border border-line bg-white px-3 py-2">
          <button onClick={() => changeDate(moveDate(dateKey, -1))} aria-label="Día anterior" className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink"><ChevronLeft size={17} /></button>
          <label className="relative flex min-w-[145px] items-center justify-center gap-2 text-[13px] font-semibold capitalize text-ink">
            <span>{readableDate(dateKey)}</span>
            <input
              aria-label="Seleccionar día"
              type="date"
              value={dateKey}
              onChange={(event) => { if (event.target.value) changeDate(event.target.value); }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <button onClick={() => changeDate(moveDate(dateKey, 1))} aria-label="Día siguiente" className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink"><ChevronRight size={17} /></button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          {error && (
            <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <span>{error}</span>
              <button onClick={() => void loadTasks(dateKey)} className="font-semibold underline underline-offset-2">Reintentar</button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-28 items-center justify-center text-muted"><LoaderCircle className="animate-spin" size={21} /></div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-canvas/60 px-4 py-7 text-center">
              <p className="text-[13px] font-semibold text-ink">Un día nuevo, una página en blanco.</p>
              <p className="mt-1 text-[12px] text-muted">Agrega la primera tarea para empezar a medir tu avance.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {sortedTasks.map((task) => {
                const category = isCategoryKey(task.categoryKey) ? categoryConfig[task.categoryKey] : null;
                return (
                  <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0">
                    <button
                      aria-label={task.completed ? `Marcar "${task.description}" como no completada` : `Marcar "${task.description}" al 100%`}
                      onClick={() => void saveTaskProgress(task, task.completed ? 0 : 100)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${task.completed ? "border-mint bg-mint text-white" : "border-line text-transparent hover:border-mint"}`}
                    >
                      {task.completed ? <Check size={12} strokeWidth={3} /> : <Circle size={17} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-[13px] font-semibold ${task.completed ? "text-muted line-through" : "text-ink"}`}>{task.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">{category?.label ?? task.categoryKey}</span>
                        <label className="inline-flex items-center gap-1 rounded-full bg-mint-card px-2 py-0.5 text-[10px] font-bold text-mint">
                          <span>Completitud</span>
                          <input
                            aria-label={`Porcentaje completado de "${task.description}"`}
                            type="number"
                            min="0"
                            max="100"
                            value={task.progressPercent}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === "") {
                                setTasks((current) => current.map((item) => item.id === task.id ? { ...item, progressPercent: 0, completed: false } : item));
                                return;
                              }
                              const progressPercent = Number(value);
                              if (Number.isInteger(progressPercent) && progressPercent >= 0 && progressPercent <= 100) {
                                setTasks((current) => current.map((item) => item.id === task.id ? { ...item, progressPercent, completed: progressPercent >= 80 } : item));
                              }
                            }}
                            onBlur={(event) => {
                              const progressPercent = Number(event.currentTarget.value);
                              if (Number.isInteger(progressPercent) && progressPercent >= 0 && progressPercent <= 100 && progressPercent !== task.progressPercent) {
                                void saveTaskProgress(task, progressPercent);
                              }
                            }}
                            className="w-8 border-0 bg-transparent p-0 text-right text-[10px] font-bold text-mint outline-none focus:ring-0"
                          />
                          <span>%</span>
                        </label>
                      </div>
                      {deletingId === task.id && (
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          <span className="text-red-700">¿Eliminar esta tarea?</span>
                          <button onClick={() => void deleteTask(task.id)} className="font-bold text-red-700 underline">Sí, eliminar</button>
                          <button onClick={() => setDeletingId(null)} className="font-semibold text-muted underline">Cancelar</button>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button aria-label={`Editar "${task.description}"`} onClick={() => startEditing(task)} className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"><Pencil size={15} /></button>
                      <button aria-label={`Eliminar "${task.description}"`} onClick={() => { setEditingId(null); setDeletingId(task.id); }} className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={submitTask} className="mt-4 rounded-xl border border-line bg-canvas/50 p-3">
            <label htmlFor="daily-task-description" className="mb-1.5 block text-[11px] font-semibold text-ink">
              {editingId ? "Editar tarea" : "Nueva tarea"}
            </label>
            <input
              id="daily-task-description"
              required
              minLength={1}
              maxLength={160}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Ej. Caminar 30 minutos"
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-[12px] text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint/10"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Área de la tarea"
                value={draft.categoryKey}
                onChange={(event) => {
                  const categoryKey = event.target.value;
                  if (isCategoryKey(categoryKey)) setDraft((current) => ({ ...current, categoryKey }));
                }}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[12px] text-ink outline-none focus:border-mint"
              >
                {(Object.keys(categoryConfig) as CategoryKey[]).map((key) => <option key={key} value={key}>{categoryConfig[key].label}</option>)}
              </select>
              <label className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5">
                <span className="text-[11px] font-semibold text-muted">Completado</span>
                <input
                  aria-label="Porcentaje completado de la tarea"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={draft.progressPercent}
                  onChange={(event) => setDraft((current) => ({ ...current, progressPercent: event.target.value }))}
                  className="w-12 border-0 bg-transparent p-0 text-right text-[12px] font-semibold text-ink outline-none focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-muted">%</span>
              </label>
              {editingId && (
                <input
                  aria-label="Fecha de la tarea"
                  type="date"
                  value={draft.dateKey}
                  onChange={(event) => setDraft((current) => ({ ...current, dateKey: event.target.value }))}
                  className="h-10 rounded-lg border border-line bg-white px-2 text-[12px] text-ink outline-none focus:border-mint"
                />
              )}
              <button disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-[12px] font-bold text-white transition hover:bg-ink/90 disabled:opacity-60">
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : editingId ? <Save size={15} /> : <Plus size={15} />}
                {saving ? "Guardando..." : editingId ? "Guardar" : "Agregar"}
              </button>
              {editingId && (
                <button type="button" aria-label="Cancelar edición" onClick={() => { setEditingId(null); setDraft(blankDraft(dateKey)); }} className="flex h-10 items-center justify-center rounded-lg border border-line bg-white px-3 text-muted hover:text-ink"><X size={16} /></button>
              )}
            </div>
            <p className="mt-1.5 text-right text-[10px] text-muted">{draft.description.length}/160 · Ej.: 5 de 10 repeticiones = 50%</p>
          </form>
        </div>

        <aside className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-white/60">Tareas completadas</p>
          <p className="mt-3 text-[42px] font-bold leading-none tracking-[-1.5px]">{completedCount}<span className="ml-1 text-[19px] text-white/60">/ {tasks.length}</span></p>
          <p className="mt-3 text-[12px] text-white/70">{completedCount} de {tasks.length} tareas del día</p>
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/70">Cálculo por área</span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-white/75">50% / ≥80%</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">Cada tarea aporta por separado: 50% suma media sesión y desde 80% suma una sesión completa.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
