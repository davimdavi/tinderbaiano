import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { joinRoom } from "@/lib/rooms/service";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]/join">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { code } = await ctx.params;

  try {
    const result = await joinRoom(code, session.userId);
    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/rooms/join] erro:", error);
    return NextResponse.json({ error: "Falha ao entrar na sala." }, { status: 500 });
  }
}
