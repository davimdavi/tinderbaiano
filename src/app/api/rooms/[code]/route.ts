import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRoomSnapshot, isRoomMember } from "@/lib/rooms/service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { code } = await ctx.params;
  const snapshot = await getRoomSnapshot(code);
  if (!snapshot) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  const isMember = await isRoomMember(snapshot.room.id, session.userId);

  return NextResponse.json({ ...snapshot, isMember });
}
