// SteamSpy (https://steamspy.com) é uma fonte pública e gratuita de dados agregados
// da Steam (tags da comunidade, popularidade estimada), sem contrato formal de SLA —
// usamos como complemento pra descoberta de jogos, com cache em `games`.
//
// Nota: o endpoint `request=tag` da SteamSpy está devolvendo `{}` (testado em
// produção) — provavelmente descontinuado depois das restrições que a Valve impôs
// aos dados da SteamSpy em 2018. Por isso usamos `top100in2weeks` (jogos em alta
// agora, que funciona) como funil de candidatos, e cruzamos com as tags de cada um
// via `request=appdetails` (que também funciona) pra achar afinidade com o grupo.

const STEAMSPY_BASE = "https://steamspy.com/api.php";

type SteamSpyGameEntry = {
  appid: number;
  name: string;
  owners?: string; // ex: "1,000,000 .. 2,000,000"
  positive?: number;
  negative?: number;
};

export type SteamSpyCandidate = {
  appid: number;
  name: string;
  popularityScore: number;
};

function parseOwnersLowerBound(owners?: string): number {
  if (!owners) return 0;
  const firstNumber = owners.split("..")[0]?.replace(/[^\d]/g, "");
  const parsed = Number(firstNumber);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchTop100(request: "top100in2weeks" | "top100forever"): Promise<SteamSpyCandidate[]> {
  const url = new URL(STEAMSPY_BASE);
  url.searchParams.set("request", request);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SteamSpy (${request}) falhou (status ${res.status})`);
  }
  const data = (await res.json()) as Record<string, SteamSpyGameEntry>;

  return Object.values(data).map((g) => ({
    appid: g.appid,
    name: g.name,
    popularityScore: parseOwnersLowerBound(g.owners) + (g.positive ?? 0),
  }));
}

/** Jogos em alta nas últimas 2 semanas, segundo a SteamSpy (até 100 entradas). */
export async function getTrendingGames(limit = 100): Promise<SteamSpyCandidate[]> {
  const games = await fetchTop100("top100in2weeks");
  return games.sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit);
}

/**
 * Pool de descoberta mais amplo: cruza "em alta agora" com "mais populares de
 * sempre" (dedupe por appid, mantendo a maior pontuação) — pega jogos bons que não
 * necessariamente estão bombando nas últimas 2 semanas, tipo clássicos de nicho.
 */
export async function getDiscoveryPool(limit = 200): Promise<SteamSpyCandidate[]> {
  const [trending, allTime] = await Promise.all([
    fetchTop100("top100in2weeks"),
    fetchTop100("top100forever"),
  ]);

  const byAppid = new Map<number, SteamSpyCandidate>();
  for (const game of [...trending, ...allTime]) {
    const existing = byAppid.get(game.appid);
    if (!existing || existing.popularityScore < game.popularityScore) {
      byAppid.set(game.appid, game);
    }
  }

  return [...byAppid.values()]
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);
}

export type SteamSpyAppTags = {
  appid: number;
  tags: string[];
};

/** Tags da comunidade pra um appid específico (usado pra descobrir o "gosto" do grupo). */
export async function getTagsForApp(appid: number): Promise<SteamSpyAppTags> {
  const url = new URL(STEAMSPY_BASE);
  url.searchParams.set("request", "appdetails");
  url.searchParams.set("appid", String(appid));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SteamSpy (appdetails) falhou (status ${res.status})`);
  }
  const data = await res.json();
  const tags = data?.tags && typeof data.tags === "object" ? Object.keys(data.tags) : [];
  return { appid, tags };
}
