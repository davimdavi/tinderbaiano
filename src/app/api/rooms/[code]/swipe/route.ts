import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getRoomByCode, isRoomMember, recordSwipe } from "@/lib/rooms/service";

const schema = z.object({
  appid: z.number().int().positive(),
  liked: z.boolean(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/swipe">
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

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    await recordSwipe(room.id, session.userId, parsed.data.appid, parsed.data.liked);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/rooms/swipe] erro:", error);
    return NextResponse.json({ error: "Falha ao registrar swipe." }, { status: 500 });
  }
}
