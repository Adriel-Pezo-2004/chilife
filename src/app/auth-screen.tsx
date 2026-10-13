"use client";

import { FormEvent, useState } from "react";
import { Heart, LoaderCircle, Sparkles } from "lucide-react";

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

type AuthScreenProps = {
  onAuthenticated: (user: AuthenticatedUser) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo validar tu cuenta.");
      onAuthenticated(data.user as AuthenticatedUser);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo validar tu cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <section className="grid w-full max-w-[900px] overflow-hidden rounded-[28px] border border-line bg-white shadow-card md:grid-cols-[1fr_1fr]">
        <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-ink p-8 text-white sm:p-10 md:min-h-[580px]">
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-5 top-36 h-44 w-44 rounded-full border border-white/10" />
          <a href="/" className="relative flex items-center gap-3" aria-label="ChiLife">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/10 text-mint"><Heart size={19} fill="currentColor" /></span>
            <span className="text-[21px] font-bold tracking-[-0.8px]">chi<span className="text-mint">life</span></span>
          </a>
          <div className="relative mt-10 md:mt-0">
            <Sparkles className="mb-5 text-mint" size={23} />
            <h1 className="max-w-sm text-[34px] font-bold leading-tight tracking-[-1.5px] sm:text-[40px]">Una vida más tuya, día a día.</h1>
            <p className="mt-4 max-w-sm text-[14px] leading-6 text-white/65">Cuida tus cinco áreas, encuentra tu balance y celebra lo que construyes.</p>
          </div>
          <p className="relative mt-8 text-[12px] text-white/45">Tu espacio personal de bienestar.</p>
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-10">
          <div className="mb-7 flex gap-2 rounded-xl bg-canvas p-1">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`h-10 flex-1 rounded-lg text-[13px] font-semibold transition ${mode === "register" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`h-10 flex-1 rounded-lg text-[13px] font-semibold transition ${mode === "login" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              Iniciar sesión
            </button>
          </div>

          <h2 className="text-[25px] font-bold tracking-[-0.7px] text-ink">{mode === "register" ? "Empieza por ti." : "Qué bueno verte."}</h2>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            {mode === "register" ? "Crea tu espacio y haz que tus avances cuenten." : "Entra a tu espacio y continúa desde donde estás."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink">Tu nombre</span>
                <input
                  autoComplete="name"
                  maxLength={80}
                  minLength={2}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[13px] text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/10"
                  placeholder="¿Cómo te llamamos?"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink">Correo electrónico</span>
              <input
                autoComplete="email"
                maxLength={254}
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[13px] text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/10"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink">Contraseña</span>
              <input
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={mode === "register" ? 10 : undefined}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[13px] text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/10"
                placeholder={mode === "register" ? "Al menos 10 caracteres" : "Tu contraseña"}
              />
            </label>

            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

            <button
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-bold text-white transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-70"
            >
              {busy && <LoaderCircle className="animate-spin" size={16} />}
              {busy ? "Un momento..." : mode === "register" ? "Crear mi cuenta" : "Iniciar sesión"}
            </button>
          </form>
          {mode === "register" && <p className="mt-4 text-center text-[11px] leading-5 text-muted">Al crear tu cuenta, tus planes y tareas serán privados.</p>}
        </div>
      </section>
    </main>
  );
}
