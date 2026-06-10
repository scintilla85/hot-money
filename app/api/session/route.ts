import { NextResponse } from "next/server";
import { clearServerRole, getServerRole, setServerRole, type AppRole } from "@/lib/server-auth";

export async function GET() {
  const role = await getServerRole();
  return NextResponse.json({ role });
}

export async function POST(request: Request) {
  const { role, password } = (await request.json()) as { role?: AppRole; password?: string };
  const valid =
    (role === "director" && password === "andrea198585") ||
    (role === "contestant" && password === "alice1990");

  if (!valid || !role) return NextResponse.json({ error: "Password non valida" }, { status: 401 });
  await setServerRole(role);
  return NextResponse.json({ ok: true, role });
}

export async function DELETE() {
  await clearServerRole();
  return NextResponse.json({ ok: true });
}
