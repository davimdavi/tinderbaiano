import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  addGameToPool,
  ensureGameCached,
  getRoomByCode,
  isRoomMember,
  removeGameFromPool,
} from "@/lib/rooms/service";
import { getAppDetails } from "@/lib/steam/storeApi";

const addSchema = z.object({
  appid: z.number().int().positive(),
  name: z.string().min(1),
  iconUrl: z.string().url().nullable().optional(),
  headerImage: z.string().url().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  isFree: z.boolean().nullable().optional(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/pool">
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
  if (room.status !== "curating_pool") {
    return NextResponse.json(
      { error: "Essa sala já passou da fase de montar o pool." },
      { status: 409 }
    );
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    let game = parsed.data;
    // A biblioteca e a busca simples não trazem gênero/ano/preço (só a
    // aba de recomendados já busca isso) — completa com o appdetails da Steam
    // antes de cachear, pra sempre ter o "bio" do jogo no card de swipe.
    if (game.genres == null && game.releaseDate == null && game.isFree == null) {
      const details = await getAppDetails(game.appid).catch(() => null);
      if (details) {
        game = {
          ...game,
          headerImage: game.headerImage ?? details.headerImage,
          genres: details.genres,
          releaseDate: details.releaseDate,
          isFree: details.isFree,
        };
      }
    }

    await ensureGameCached(game);
    await addGameToPool(room.id, game.appid, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/rooms/pool POST] erro:", error);
    return NextResponse.json({ error: "Falha ao adicionar jogo." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/pool">
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
  if (room.status !== "curating_pool") {
    return NextResponse.json(
      { error: "Essa sala já passou da fase de montar o pool." },
      { status: 409 }
    );
  }

  const appid = Number(new URL(request.url).searchParams.get("appid"));
  if (!Number.isInteger(appid) || appid <= 0) {
    return NextResponse.json({ error: "appid inválido." }, { status: 400 });
  }

  try {
    await removeGameFromPool(room.id, appid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/rooms/pool DELETE] erro:", error);
    return NextResponse.json({ error: "Falha ao remover jogo." }, { status: 500 });
  }
}
