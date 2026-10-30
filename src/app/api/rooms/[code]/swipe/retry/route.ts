import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getRoomByCode,
  getRoomSnapshot,
  isRoomMember,
  resetSwipes,
} from "@/lib/rooms/service";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]/swipe/retry">
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
  if (room.status !== "swiping") {
    return NextResponse.json(
      { error: "Essa sala não está na fase de swipe agora." },
      { status: 409 }
    );
  }

  const snapshot = await getRoomSnapshot(code);
  if (snapshot && snapshot.matches.length > 0) {
    return NextResponse.json(
      { error: "Já tem match nessa sala, não dá pra reiniciar." },
      { status: 409 }
    );
  }

  try {
    await resetSwipes(room.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/rooms/swipe/retry] erro:", error);
    return NextResponse.json({ error: "Falha ao reiniciar os swipes." }, { status: 500 });
  }
}
