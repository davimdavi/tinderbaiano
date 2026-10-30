import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRoomByCode, isRoomMember } from "@/lib/rooms/service";
import { searchStoreGames } from "@/lib/steam/storeApi";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/search">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { code } = await ctx.params;
  const room = await getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  if (!(await isRoomMember(room.id, session.userId))) {
    return NextResponse.json({ error: "Você não está nessa sala." }, { status: 403 });
  }

  const term = new URL(request.url).searchParams.get("q")?.trim();
  if (!term || term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchStoreGames(term);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/rooms/search] erro:", error);
    return NextResponse.json({ error: "Busca falhou, tenta de novo." }, { status: 502 });
  }
}
