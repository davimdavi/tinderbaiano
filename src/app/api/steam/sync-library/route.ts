import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { syncUserLibrary } from "@/lib/steam/sync";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const result = await syncUserLibrary(session.userId, session.steamId64);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/steam/sync-library] erro:", error);
    return NextResponse.json(
      { error: "Falha ao sincronizar biblioteca." },
      { status: 500 }
    );
  }
}
