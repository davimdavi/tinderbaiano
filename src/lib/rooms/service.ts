import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateRoomCode } from "@/lib/rooms/code";
import { startBracket } from "@/lib/bracket/service";
import type { DbRoom, MatchedGameView, PoolGameView, RoomMemberView } from "@/lib/types";

export async function createRoom(hostUserId: string): Promise<{ id: string; code: string }> {
  const admin = getSupabaseAdmin();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await admin
      .from("rooms")
      .insert({ code, host_user_id: hostUserId })
      .select("id, code")
      .single();

    if (!error && data) {
      const { error: memberError } = await admin
        .from("room_members")
        .insert({ room_id: data.id, user_id: hostUserId });
      if (memberError) {
        throw new Error(`Falha ao entrar na própria sala: ${memberError.message}`);
      }
      return data;
    }

    // 23505 = unique_violation (código colidiu com outra sala) -> tenta outro código.
    if (error && error.code !== "23505") {
      throw new Error(`Falha ao criar sala: ${error.message}`);
    }
  }

  throw new Error("Não consegui gerar um código de sala único. Tenta de novo.");
}

export type JoinRoomResult =
  | { roomId: string; code: string }
  | { error: "not_found" | "already_started" };

export async function joinRoom(code: string, userId: string): Promise<JoinRoomResult> {
  const admin = getSupabaseAdmin();

  const { data: room, error } = await admin
    .from("rooms")
    .select("id, code, status")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar sala: ${error.message}`);
  }
  if (!room) {
    return { error: "not_found" };
  }
  if (room.status !== "curating_pool") {
    return { error: "already_started" };
  }

  const { error: insertError } = await admin
    .from("room_members")
    .upsert(
      { room_id: room.id, user_id: userId },
      { onConflict: "room_id,user_id", ignoreDuplicates: true }
    );

  if (insertError) {
    throw new Error(`Falha ao entrar na sala: ${insertError.message}`);
  }

  return { roomId: room.id, code: room.code };
}

export async function getRoomByCode(code: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("rooms")
    .select("id, code, status, host_user_id, created_at, winner_appid")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar sala: ${error.message}`);
  return data;
}

export async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao checar participação: ${error.message}`);
  return Boolean(data);
}

type CacheableGame = {
  appid: number;
  name: string;
  iconUrl?: string | null;
  headerImage?: string | null;
  genres?: string[] | null;
  releaseDate?: string | null;
  isFree?: boolean | null;
};

/**
 * Cacheia/atualiza um jogo em `games`. Só sobrescreve os campos informados — se o
 * chamador não tem a imagem de capa ou os gêneros à mão (ex: resultado de busca
 * simples), não apaga o que já estava cacheado de antes.
 */
export async function ensureGameCached(game: CacheableGame): Promise<void> {
  const admin = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    appid: game.appid,
    name: game.name,
    last_fetched_at: new Date().toISOString(),
  };
  if (game.iconUrl !== undefined) row.icon_url = game.iconUrl;
  if (game.headerImage !== undefined) row.header_image = game.headerImage;
  if (game.genres !== undefined) row.genres = game.genres;
  if (game.releaseDate !== undefined) row.release_date = game.releaseDate;
  if (game.isFree !== undefined) row.is_free = game.isFree;

  const { error } = await admin.from("games").upsert(row, { onConflict: "appid" });
  if (error) throw new Error(`Falha ao cachear jogo: ${error.message}`);
}

export async function addGameToPool(
  roomId: string,
  appid: number,
  addedByUserId: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("room_pool_games")
    .upsert(
      { room_id: roomId, appid, added_by_user: addedByUserId },
      { onConflict: "room_id,appid", ignoreDuplicates: true }
    );
  if (error) throw new Error(`Falha ao adicionar jogo ao pool: ${error.message}`);
}

export async function removeGameFromPool(roomId: string, appid: number): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("room_pool_games")
    .delete()
    .eq("room_id", roomId)
    .eq("appid", appid);
  if (error) throw new Error(`Falha ao remover jogo do pool: ${error.message}`);
}

export async function setMemberReady(
  roomId: string,
  userId: string,
  isReady: boolean
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("room_members")
    .update({ is_ready: isReady })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw new Error(`Falha ao atualizar status: ${error.message}`);

  if (isReady) {
    await maybeStartSwiping(roomId);
  }
}

/**
 * Quando todo mundo da sala marca "pronto" e o pool tem pelo menos 2 jogos, a sala
 * avança sozinha pra fase de swipe — sem precisar de um botão de "iniciar" do host.
 */
async function maybeStartSwiping(roomId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: room } = await admin
    .from("rooms")
    .select("status")
    .eq("id", roomId)
    .single();
  if (!room || room.status !== "curating_pool") return;

  const { data: members, error: membersError } = await admin
    .from("room_members")
    .select("is_ready")
    .eq("room_id", roomId);
  if (membersError || !members || members.length === 0) return;
  if (!members.every((m) => m.is_ready)) return;

  const { count } = await admin
    .from("room_pool_games")
    .select("appid", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (!count || count < 2) return;

  await admin.from("rooms").update({ status: "swiping" }).eq("id", roomId);
}

type MemberRow = {
  user_id: string;
  is_ready: boolean;
  users: { persona_name: string | null; avatar_url: string | null } | null;
};

type PoolRow = {
  appid: number;
  added_by_user: string | null;
  games: { name: string; icon_url: string | null; header_image: string | null } | null;
  users: { persona_name: string | null } | null;
};

type MatchRow = {
  appid: number;
  games: { name: string; icon_url: string | null; header_image: string | null } | null;
};

export type RoomSnapshot = {
  room: DbRoom;
  members: RoomMemberView[];
  pool: PoolGameView[];
  matches: MatchedGameView[];
  winnerGame: MatchedGameView | null;
};

export async function getRoomSnapshot(code: string): Promise<RoomSnapshot | null> {
  const admin = getSupabaseAdmin();
  const room = await getRoomByCode(code);
  if (!room) return null;

  const { data: memberRows, error: membersError } = await admin
    .from("room_members")
    .select("user_id, is_ready, users(persona_name, avatar_url)")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true })
    .returns<MemberRow[]>();
  if (membersError) throw new Error(`Falha ao buscar membros: ${membersError.message}`);

  const { data: swipeRows, error: swipesError } = await admin
    .from("swipes")
    .select("user_id")
    .eq("room_id", room.id);
  if (swipesError) throw new Error(`Falha ao buscar swipes: ${swipesError.message}`);
  const swipedCountByUser = new Map<string, number>();
  for (const row of swipeRows ?? []) {
    const userId = row.user_id as string;
    swipedCountByUser.set(userId, (swipedCountByUser.get(userId) ?? 0) + 1);
  }

  const members: RoomMemberView[] = (memberRows ?? []).map((row) => ({
    userId: row.user_id,
    personaName: row.users?.persona_name ?? null,
    avatarUrl: row.users?.avatar_url ?? null,
    isReady: row.is_ready,
    isHost: row.user_id === room.host_user_id,
    swipedCount: swipedCountByUser.get(row.user_id) ?? 0,
  }));

  const { data: poolRows, error: poolError } = await admin
    .from("room_pool_games")
    .select("appid, added_by_user, games(name, icon_url, header_image), users(persona_name)")
    .eq("room_id", room.id)
    .order("added_at", { ascending: true })
    .returns<PoolRow[]>();
  if (poolError) throw new Error(`Falha ao buscar pool: ${poolError.message}`);

  const pool: PoolGameView[] = (poolRows ?? []).map((row) => ({
    appid: row.appid,
    name: row.games?.name ?? `App ${row.appid}`,
    iconUrl: row.games?.icon_url ?? null,
    headerImage: row.games?.header_image ?? null,
    addedByUserId: row.added_by_user,
    addedByName: row.users?.persona_name ?? null,
  }));

  const { data: matchRows, error: matchesError } = await admin
    .from("room_matches")
    .select("appid, games(name, icon_url, header_image)")
    .eq("room_id", room.id)
    .order("matched_at", { ascending: true })
    .returns<MatchRow[]>();
  if (matchesError) throw new Error(`Falha ao buscar matches: ${matchesError.message}`);

  const matches: MatchedGameView[] = (matchRows ?? []).map((row) => ({
    appid: row.appid,
    name: row.games?.name ?? `App ${row.appid}`,
    iconUrl: row.games?.icon_url ?? null,
    headerImage: row.games?.header_image ?? null,
  }));

  let winnerGame: MatchedGameView | null = null;
  if (room.winner_appid) {
    const { data: winnerRow } = await admin
      .from("games")
      .select("appid, name, icon_url, header_image")
      .eq("appid", room.winner_appid)
      .maybeSingle();
    if (winnerRow) {
      winnerGame = {
        appid: winnerRow.appid as number,
        name: winnerRow.name as string,
        iconUrl: (winnerRow.icon_url as string) ?? null,
        headerImage: (winnerRow.header_image as string) ?? null,
      };
    }
  }

  return { room: room as DbRoom, members, pool, matches, winnerGame };
}

export async function getUserSwipedAppids(
  roomId: string,
  userId: string
): Promise<number[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("swipes")
    .select("appid")
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw new Error(`Falha ao buscar seus swipes: ${error.message}`);
  return (data ?? []).map((row) => row.appid as number);
}

export async function recordSwipe(
  roomId: string,
  userId: string,
  appid: number,
  liked: boolean
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("swipes")
    .upsert(
      { room_id: roomId, user_id: userId, appid, liked, swiped_at: new Date().toISOString() },
      { onConflict: "room_id,user_id,appid" }
    );
  if (error) throw new Error(`Falha ao gravar swipe: ${error.message}`);

  if (liked) {
    await maybeRecordMatch(roomId, appid);
  }
  await maybeFinalizeSwiping(roomId);
}

async function maybeRecordMatch(roomId: string, appid: number): Promise<void> {
  const admin = getSupabaseAdmin();

  const { count: memberCount } = await admin
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (!memberCount) return;

  const { count: likedCount } = await admin
    .from("swipes")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("appid", appid)
    .eq("liked", true);
  if (!likedCount || likedCount < memberCount) return;

  await admin
    .from("room_matches")
    .upsert({ room_id: roomId, appid }, { onConflict: "room_id,appid", ignoreDuplicates: true });
}

/**
 * Quando todo mundo da sala já swipou todos os jogos do pool, decide o que acontece:
 * 1 match -> termina a sala com esse jogo vencedor; 2+ matches -> vai pro mata-mata;
 * 0 matches -> fica em 'swiping' mesmo (o cliente mostra a tela de "tenta de novo",
 * já que ninguém bateu o olho em nada).
 */
async function maybeFinalizeSwiping(roomId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: room } = await admin
    .from("rooms")
    .select("status")
    .eq("id", roomId)
    .single();
  if (!room || room.status !== "swiping") return;

  const { count: poolCount } = await admin
    .from("room_pool_games")
    .select("appid", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (!poolCount) return;

  const { data: members } = await admin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId);
  if (!members || members.length === 0) return;

  const { data: swipeRows } = await admin
    .from("swipes")
    .select("user_id")
    .eq("room_id", roomId);
  const swipedCountByUser = new Map<string, number>();
  for (const row of swipeRows ?? []) {
    const userId = row.user_id as string;
    swipedCountByUser.set(userId, (swipedCountByUser.get(userId) ?? 0) + 1);
  }

  const allDone = members.every(
    (m) => (swipedCountByUser.get(m.user_id as string) ?? 0) >= poolCount
  );
  if (!allDone) return;

  const { data: matchedGames, count: matchCount } = await admin
    .from("room_matches")
    .select("appid", { count: "exact" })
    .eq("room_id", roomId);

  if (matchCount === 1 && matchedGames?.[0]) {
    await admin
      .from("rooms")
      .update({ status: "finished", winner_appid: matchedGames[0].appid })
      .eq("id", roomId);
  } else if (matchCount && matchCount >= 2) {
    await startBracket(roomId);
  }
}

/**
 * Limpa todos os swipes da sala (pra tentar de novo depois de "ninguém bateu o olho
 * em nada"). Só faz sentido quando a sala ainda está em 'swiping' e sem matches.
 */
export async function resetSwipes(roomId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("swipes").delete().eq("room_id", roomId);
  if (error) throw new Error(`Falha ao reiniciar os swipes: ${error.message}`);
}
