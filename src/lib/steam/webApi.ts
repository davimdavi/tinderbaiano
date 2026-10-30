import { env } from "@/lib/env.server";

const BASE_URL = "https://api.steampowered.com";

export type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  communityvisibilitystate: number; // 3 = público
};

export async function getPlayerSummaries(
  steamIds: string[]
): Promise<SteamPlayerSummary[]> {
  const url = new URL(`${BASE_URL}/ISteamUser/GetPlayerSummaries/v2/`);
  url.searchParams.set("key", env.steamApiKey);
  url.searchParams.set("steamids", steamIds.join(","));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil Steam (status ${res.status})`);
  }
  const data = await res.json();
  return data.response?.players ?? [];
}

export type SteamOwnedGame = {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
};

export type OwnedGamesResult = {
  games: SteamOwnedGame[];
  /** true quando a Steam não devolveu a lista — geralmente "Detalhes do jogo" privado. */
  isPrivate: boolean;
};

export async function getOwnedGames(
  steamId64: string
): Promise<OwnedGamesResult> {
  const url = new URL(`${BASE_URL}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", env.steamApiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Falha ao buscar biblioteca Steam (status ${res.status})`);
  }
  const data = await res.json();
  const response = data.response ?? {};

  if (typeof response.game_count !== "number") {
    // Perfil com "detalhes do jogo" privado devolve {response: {}} sem erro explícito.
    return { games: [], isPrivate: true };
  }

  return { games: response.games ?? [], isPrivate: false };
}

/** URL do ícone pequeno do jogo (hash vem do GetOwnedGames com include_appinfo=1). */
export function buildGameIconUrl(appid: number, imgIconUrl?: string): string | null {
  if (!imgIconUrl) return null;
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${imgIconUrl}.jpg`;
}
