import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getRoomByCode, isRoomMember } from "@/lib/rooms/service";
import { finalizeBracketMatch } from "@/lib/bracket/service";

const schema = z.object({ matchId: z.string().uuid() });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/bracket/finalize">
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

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    await finalizeBracketMatch(parsed.data.matchId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/rooms/bracket/finalize] erro:", error);
    return NextResponse.json({ error: "Falha ao fechar o confronto." }, { status: 500 });
  }
}
