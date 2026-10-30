import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildGameIconUrl, getOwnedGames, getPlayerSummaries } from "@/lib/steam/webApi";

/**
 * Garante que existe um usuário para esse steamid64 (cria ou atualiza o perfil básico)
 * e devolve o id interno (uuid) dele.
 */
export async function upsertUserBySteamId(steamId64: string): Promise<string> {
  const admin = getSupabaseAdmin();

  const [summary] = await getPlayerSummaries([steamId64]).catch(() => []);

  const { data, error } = await admin
    .from("users")
    .upsert(
      {
        steamid64: steamId64,
        persona_name: summary?.personaname ?? null,
        avatar_url: summary?.avatarfull ?? null,
        profile_url: summary?.profileurl ?? null,
        profile_public: summary ? summary.communityvisibilitystate === 3 : true,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "steamid64" }
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao salvar usuário: ${error?.message ?? "sem dados"}`);
  }

  return data.id as string;
}

export type SyncLibraryResult = {
  gameCount: number;
  isPrivate: boolean;
};

/**
 * Sincroniza a biblioteca Steam do usuário com o cache local (tabelas `games` e
 * `user_owned_games`). Chamado no login e sob demanda (botão "atualizar biblioteca").
 */
export async function syncUserLibrary(
  userId: string,
  steamId64: string
): Promise<SyncLibraryResult> {
  const admin = getSupabaseAdmin();
  const { games, isPrivate } = await getOwnedGames(steamId64);

  if (isPrivate || games.length === 0) {
    return { gameCount: 0, isPrivate };
  }

  const gameRows = games.map((g) => ({
    appid: g.appid,
    name: g.name,
    icon_url: buildGameIconUrl(g.appid, g.img_icon_url),
    last_fetched_at: new Date().toISOString(),
  }));

  const { error: gamesError } = await admin
    .from("games")
    .upsert(gameRows, { onConflict: "appid" });
  if (gamesError) {
    throw new Error(`Falha ao cachear jogos: ${gamesError.message}`);
  }

  // Substitui o snapshot anterior da biblioteca do usuário pelo atual.
  const { error: deleteError } = await admin
    .from("user_owned_games")
    .delete()
    .eq("user_id", userId);
  if (deleteError) {
    throw new Error(`Falha ao limpar biblioteca antiga: ${deleteError.message}`);
  }

  const ownedRows = games.map((g) => ({
    user_id: userId,
    appid: g.appid,
    playtime_forever: g.playtime_forever ?? 0,
    playtime_2weeks: g.playtime_2weeks ?? 0,
    last_synced_at: new Date().toISOString(),
  }));

  const { error: insertError } = await admin
    .from("user_owned_games")
    .insert(ownedRows);
  if (insertError) {
    throw new Error(`Falha ao salvar biblioteca: ${insertError.message}`);
  }

  return { gameCount: games.length, isPrivate: false };
}
