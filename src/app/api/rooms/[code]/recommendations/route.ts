import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRoomByCode, isRoomMember } from "@/lib/rooms/service";
import { getGroupRecommendations } from "@/lib/discovery/recommendations";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]/recommendations">
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
    const results = await getGroupRecommendations(room.id);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/rooms/recommendations] erro:", error);
    return NextResponse.json(
      { error: "Não deu pra gerar recomendações agora." },
      { status: 502 }
    );
  }
}
