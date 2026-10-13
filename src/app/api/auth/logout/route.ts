import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to sign out:", error);
    return NextResponse.json({ error: "No se pudo cerrar la sesión." }, { status: 503 });
  }
}
