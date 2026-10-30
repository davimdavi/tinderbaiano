import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRoomByCode, isRoomMember } from "@/lib/rooms/service";
import { getBracketState } from "@/lib/bracket/service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]/bracket">
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

  try {
    const state = await getBracketState(room.id, session.userId);
    return NextResponse.json(state);
  } catch (error) {
    console.error("[api/rooms/bracket] erro:", error);
    return NextResponse.json({ error: "Falha ao buscar o mata-mata." }, { status: 500 });
  }
}
