import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { OwnedGameWithMeta } from "@/lib/types";

type OwnedGameRow = {
  appid: number;
  playtime_forever: number;
  playtime_2weeks: number;
  games: { name: string; icon_url: string | null } | null;
};

export async function getOwnedGamesForUser(userId: string): Promise<OwnedGameWithMeta[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_owned_games")
    .select("appid, playtime_forever, playtime_2weeks, games(name, icon_url)")
    .eq("user_id", userId)
    .returns<OwnedGameRow[]>();

  if (error) throw new Error(`Falha ao buscar biblioteca: ${error.message}`);

  return (data ?? []).map((row) => ({
    appid: row.appid,
    name: row.games?.name ?? `App ${row.appid}`,
    iconUrl: row.games?.icon_url ?? null,
    playtimeForever: row.playtime_forever,
    playtime2Weeks: row.playtime_2weeks,
  }));
}
