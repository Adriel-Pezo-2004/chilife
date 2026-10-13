import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Unable to read the current session:", error);
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
}
