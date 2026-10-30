import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BracketMatchView, BracketRound, MatchedGameView } from "@/lib/types";

const VOTE_DURATION_MS = 25_000;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function createRound(roomId: string, roundNumber: number, appids: number[]) {
  const admin = getSupabaseAdmin();
  const votingEndsAt = new Date(Date.now() + VOTE_DURATION_MS).toISOString();

  const rows: Record<string, unknown>[] = [];
  let slot = 0;
  for (let i = 0; i < appids.length; i += 2) {
    const a = appids[i];
    const b = appids[i + 1] as number | undefined;
    rows.push({
      room_id: roomId,
      round_number: roundNumber,
      slot_index: slot++,
      game_a_appid: a,
      game_b_appid: b ?? null,
      // Sem par -> "bye": passa direto pra próxima rodada, já decidido.
      status: b !== undefined ? "voting" : "decided",
      winner_appid: b !== undefined ? null : a,
      voting_ends_at: b !== undefined ? votingEndsAt : null,
    });
  }

  const { error } = await admin.from("bracket_matches").insert(rows);
  if (error) throw new Error(`Falha ao criar rodada do mata-mata: ${error.message}`);

  await maybeAdvanceRound(roomId, roundNumber);
}

/**
 * Pega os jogos que deram match (2+) e começa o mata-mata: embaralha (pra quem
 * ficar sem par de "bye" ser aleatório) e monta a primeira rodada.
 */
export async function startBracket(roomId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: matches, error } = await admin
    .from("room_matches")
    .select("appid")
    .eq("room_id", roomId);
  if (error) throw new Error(`Falha ao buscar matches: ${error.message}`);

  const appids = shuffle((matches ?? []).map((m) => m.appid as number));
  if (appids.length < 2) return;

  await admin.from("rooms").update({ status: "bracket" }).eq("id", roomId);
  await createRound(roomId, 1, appids);
}

export async function recordBracketVote(
  matchId: string,
  userId: string,
  votedAppid: number
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: match, error: matchError } = await admin
    .from("bracket_matches")
    .select("room_id, status, game_a_appid, game_b_appid")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError) throw new Error(`Falha ao buscar confronto: ${matchError.message}`);
  if (!match || match.status !== "voting") return;
  if (votedAppid !== match.game_a_appid && votedAppid !== match.game_b_appid) {
    throw new Error("Voto inválido pra esse confronto.");
  }

  const { error } = await admin
    .from("bracket_votes")
    .upsert(
      {
        bracket_match_id: matchId,
        room_id: match.room_id,
        user_id: userId,
        voted_appid: votedAppid,
      },
      { onConflict: "bracket_match_id,user_id" }
    );
  if (error) throw new Error(`Falha ao registrar voto: ${error.message}`);

  const { count: memberCount } = await admin
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", match.room_id);
  const { count: voteCount } = await admin
    .from("bracket_votes")
    .select("user_id", { count: "exact", head: true })
    .eq("bracket_match_id", matchId);

  if (memberCount && voteCount && voteCount >= memberCount) {
    await finalizeBracketMatch(matchId);
  }
}

/**
 * Decide um confronto com os votos que existirem até agora — chamado quando todo
 * mundo já votou, ou quando o cronômetro do cliente zera. Empate (incluindo
 * ninguém ter votado) é resolvido no cara-ou-coroa.
 */
export async function finalizeBracketMatch(matchId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: match, error } = await admin
    .from("bracket_matches")
    .select("room_id, round_number, status, game_a_appid, game_b_appid")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar confronto: ${error.message}`);
  if (!match || match.status !== "voting") return;
  if (!match.game_a_appid || !match.game_b_appid) return; // bye não passa por aqui

  const { data: votes } = await admin
    .from("bracket_votes")
    .select("voted_appid")
    .eq("bracket_match_id", matchId);

  let votesA = 0;
  let votesB = 0;
  for (const v of votes ?? []) {
    if (v.voted_appid === match.game_a_appid) votesA++;
    else if (v.voted_appid === match.game_b_appid) votesB++;
  }

  const winner =
    votesA === votesB
      ? Math.random() < 0.5
        ? match.game_a_appid
        : match.game_b_appid
      : votesA > votesB
        ? match.game_a_appid
        : match.game_b_appid;

  // O `.eq("status", "voting")` evita decidir duas vezes se duas chamadas
  // chegarem quase juntas (ex: último voto e o timer do cliente ao mesmo tempo).
  const { data: updated, error: updateError } = await admin
    .from("bracket_matches")
    .update({ status: "decided", winner_appid: winner })
    .eq("id", matchId)
    .eq("status", "voting")
    .select("id");
  if (updateError) throw new Error(`Falha ao decidir confronto: ${updateError.message}`);
  if (!updated || updated.length === 0) return; // outra chamada já decidiu primeiro

  await maybeAdvanceRound(match.room_id, match.round_number);
}

async function maybeAdvanceRound(roomId: string, roundNumber: number): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: roundMatches, error } = await admin
    .from("bracket_matches")
    .select("status, winner_appid")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (error) throw new Error(`Falha ao conferir rodada: ${error.message}`);
  if (!roundMatches || roundMatches.length === 0) return;
  if (!roundMatches.every((m) => m.status === "decided")) return;

  const winners = roundMatches.map((m) => m.winner_appid as number);
  if (winners.length === 1) {
    await admin
      .from("rooms")
      .update({ status: "finished", winner_appid: winners[0] })
      .eq("id", roomId);
    return;
  }

  await createRound(roomId, roundNumber + 1, winners);
}

export async function getBracketState(
  roomId: string,
  currentUserId: string
): Promise<{ rounds: BracketRound[] }> {
  const admin = getSupabaseAdmin();

  const { data: matchRows, error } = await admin
    .from("bracket_matches")
    .select(
      "id, round_number, slot_index, game_a_appid, game_b_appid, winner_appid, status, voting_ends_at"
    )
    .eq("room_id", roomId)
    .order("round_number", { ascending: true })
    .order("slot_index", { ascending: true });
  if (error) throw new Error(`Falha ao buscar mata-mata: ${error.message}`);
  if (!matchRows || matchRows.length === 0) return { rounds: [] };

  const appidsNeeded = new Set<number>();
  for (const m of matchRows) {
    if (m.game_a_appid) appidsNeeded.add(m.game_a_appid as number);
    if (m.game_b_appid) appidsNeeded.add(m.game_b_appid as number);
  }
  const { data: gameRows } = await admin
    .from("games")
    .select("appid, name, icon_url, header_image")
    .in("appid", [...appidsNeeded]);
  const gameMap = new Map(
    (gameRows ?? []).map((g) => [g.appid as number, g as Record<string, unknown>])
  );

  const matchIds = matchRows.map((m) => m.id as string);
  const { data: voteRows } = await admin
    .from("bracket_votes")
    .select("bracket_match_id, user_id, voted_appid")
    .in("bracket_match_id", matchIds);

  const votesByMatch = new Map<string, { appid: number; userId: string }[]>();
  for (const v of voteRows ?? []) {
    const key = v.bracket_match_id as string;
    const list = votesByMatch.get(key) ?? [];
    list.push({ appid: v.voted_appid as number, userId: v.user_id as string });
    votesByMatch.set(key, list);
  }

  function toGameRef(appid: number | null): MatchedGameView | null {
    if (!appid) return null;
    const g = gameMap.get(appid);
    return {
      appid,
      name: (g?.name as string) ?? `App ${appid}`,
      iconUrl: (g?.icon_url as string) ?? null,
      headerImage: (g?.header_image as string) ?? null,
    };
  }

  const roundsMap = new Map<number, BracketMatchView[]>();
  for (const m of matchRows) {
    const votes = votesByMatch.get(m.id as string) ?? [];
    const view: BracketMatchView = {
      id: m.id as string,
      roundNumber: m.round_number as number,
      slotIndex: m.slot_index as number,
      gameA: toGameRef(m.game_a_appid as number | null),
      gameB: toGameRef(m.game_b_appid as number | null),
      winnerAppid: m.winner_appid as number | null,
      status: m.status as "voting" | "decided",
      votingEndsAt: m.voting_ends_at as string | null,
      votesA: votes.filter((v) => v.appid === m.game_a_appid).length,
      votesB: votes.filter((v) => v.appid === m.game_b_appid).length,
      myVote: votes.find((v) => v.userId === currentUserId)?.appid ?? null,
    };
    const list = roundsMap.get(view.roundNumber) ?? [];
    list.push(view);
    roundsMap.set(view.roundNumber, list);
  }

  const rounds: BracketRound[] = [...roundsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([roundNumber, matches]) => ({
      roundNumber,
      matches: matches.sort((a, b) => a.slotIndex - b.slotIndex),
    }));

  return { rounds };
}
