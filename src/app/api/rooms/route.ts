import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createRoom } from "@/lib/rooms/service";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const room = await createRoom(session.userId);
    return NextResponse.json(room);
  } catch (error) {
    console.error("[api/rooms] erro:", error);
    return NextResponse.json({ error: "Falha ao criar sala." }, { status: 500 });
  }
}
