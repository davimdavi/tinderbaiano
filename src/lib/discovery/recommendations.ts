import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppDetails, type AppDetails } from "@/lib/steam/storeApi";
import { getTagsForApp, getTrendingGames } from "@/lib/steam/steamSpy";

const TOP_GAMES_PER_MEMBER = 8;
const TOP_TAGS_TO_USE = 8;
const TRENDING_POOL_SIZE = 100;
const FINAL_RECOMMENDATION_COUNT = 16;
const TAG_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export type RecommendedGame = {
  appid: number;
  name: string;
  headerImage: string | null;
  genres: string[];
  releaseDate: string | null;
  releaseDateDisplay: string | null;
  isFree: boolean;
  popularityScore: number;
};

/**
 * Recomenda jogos ONLINE (com algum modo pela internet — não só local/split-screen)
 * que ninguém do grupo tem e que ainda não estão no pool da sala.
 *
 * A lógica liga cada tag favorita do grupo (tirada dos jogos mais jogados de cada
 * membro) individualmente a jogos em alta que têm aquela tag — um jogo não precisa
 * bater com TODAS as tags do grupo pra aparecer, só com UMA já basta. A seleção final
 * passeia por cada tag em rodadas (um jogo de cada vez, por tag), em vez de só pegar
 * os jogos que coincidem com mais tags ao mesmo tempo — assim a lista reflete os
 * gostos individuais do grupo, não só a interseção deles.
 */
export async function getGroupRecommendations(roomId: string): Promise<RecommendedGame[]> {
  const admin = getSupabaseAdmin();

  const { data: members, error: membersError } = await admin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId);
  if (membersError) throw new Error(`Falha ao buscar membros: ${membersError.message}`);
  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (memberIds.length === 0) return [];

  const { data: ownedRows, error: ownedError } = await admin
    .from("user_owned_games")
    .select("user_id, appid, playtime_forever")
    .in("user_id", memberIds)
    .order("playtime_forever", { ascending: false });
  if (ownedError) throw new Error(`Falha ao buscar bibliotecas: ${ownedError.message}`);

  const ownedByGroup = new Set<number>();
  const topGamesByMember = new Map<string, number[]>();
  for (const row of ownedRows ?? []) {
    const appid = row.appid as number;
    const userId = row.user_id as string;
    ownedByGroup.add(appid);
    const list = topGamesByMember.get(userId) ?? [];
    if (list.length < TOP_GAMES_PER_MEMBER) {
      list.push(appid);
      topGamesByMember.set(userId, list);
    }
  }

  const { data: poolRows } = await admin
    .from("room_pool_games")
    .select("appid")
    .eq("room_id", roomId);
  const inPool = new Set((poolRows ?? []).map((r) => r.appid as number));

  const seedAppids = [...new Set([...topGamesByMember.values()].flat())];

  // 1. Tags favoritas do grupo (cada uma é tratada de forma independente depois).
  const groupTagWeights = new Map<string, number>();
  await Promise.all(
    seedAppids.map(async (appid) => {
      const tags = await getCachedOrFreshTags(appid);
      for (const tag of tags) {
        groupTagWeights.set(tag, (groupTagWeights.get(tag) ?? 0) + 1);
      }
    })
  );
  const topTags = [...groupTagWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TAGS_TO_USE)
    .map(([tag]) => tag);
  if (topTags.length === 0) return [];

  // 2. Jogos em alta no momento que ninguém do grupo tem e que ainda não estão no pool.
  const trending = await getTrendingGames(TRENDING_POOL_SIZE).catch(() => []);
  const candidates = trending.filter(
    (g) => !ownedByGroup.has(g.appid) && !inPool.has(g.appid)
  );
  if (candidates.length === 0) return [];

  // 3. Pra cada candidato, busca as próprias tags e descobre em quais "baldes" de
  // tag do grupo ele se encaixa (pode entrar em mais de um).
  const candidateTags = new Map<number, string[]>();
  await Promise.all(
    candidates.map(async (c) => {
      candidateTags.set(c.appid, await getCachedOrFreshTags(c.appid, c.name));
    })
  );

  const byPopularity = new Map(candidates.map((c) => [c.appid, c.popularityScore]));
  const bucketsByTag = new Map<string, number[]>(); // tag -> appids (ordenados por popularidade)
  for (const tag of topTags) {
    const bucket = candidates
      .filter((c) => candidateTags.get(c.appid)?.includes(tag))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .map((c) => c.appid);
    bucketsByTag.set(tag, bucket);
  }

  // 4. Passeia pelas tags em rodadas, pegando um jogo online de cada vez de cada
  // balde, até fechar a lista final.
  const detailsCache = new Map<number, Promise<AppDetails | null>>();
  const getDetailsCached = (appid: number) => {
    if (!detailsCache.has(appid)) {
      detailsCache.set(appid, getAppDetails(appid).catch(() => null));
    }
    return detailsCache.get(appid)!;
  };

  const bucketCursors = new Map(topTags.map((tag) => [tag, 0]));
  const selected: number[] = [];
  const selectedSet = new Set<number>();

  let madeProgress = true;
  while (selected.length < FINAL_RECOMMENDATION_COUNT && madeProgress) {
    madeProgress = false;
    for (const tag of topTags) {
      if (selected.length >= FINAL_RECOMMENDATION_COUNT) break;
      const bucket = bucketsByTag.get(tag)!;
      let cursor = bucketCursors.get(tag)!;

      while (cursor < bucket.length) {
        const appid = bucket[cursor];
        cursor++;
        if (selectedSet.has(appid)) continue;

        const details = await getDetailsCached(appid);
        if (details && details.isOnlineMultiplayer) {
          selected.push(appid);
          selectedSet.add(appid);
          madeProgress = true;
          break;
        }
        // Não é online (ou falhou) -> descarta e segue pro próximo desse balde.
      }
      bucketCursors.set(tag, cursor);
    }
  }

  // 5. Monta o resultado final, cacheando os detalhes já buscados.
  const enriched = await Promise.all(
    selected.map(async (appid) => {
      const details = await getDetailsCached(appid);
      if (details) {
        await admin.from("games").upsert(
          {
            appid,
            name: details.name,
            header_image: details.headerImage,
            genres: details.genres,
            release_date: details.releaseDate,
            is_free: details.isFree,
            last_fetched_at: new Date().toISOString(),
          },
          { onConflict: "appid" }
        );
      }
      const game: RecommendedGame = {
        appid,
        name: details?.name ?? `App ${appid}`,
        headerImage: details?.headerImage ?? null,
        genres: details?.genres ?? [],
        releaseDate: details?.releaseDate ?? null,
        releaseDateDisplay: details?.releaseDateDisplay ?? null,
        isFree: details?.isFree ?? false,
        popularityScore: byPopularity.get(appid) ?? 0,
      };
      return game;
    })
  );

  return enriched;
}

async function getCachedOrFreshTags(
  appid: number,
  fallbackName?: string
): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("games")
    .select("tags, last_fetched_at")
    .eq("appid", appid)
    .maybeSingle();

  const isFresh =
    data?.tags &&
    (data.tags as string[]).length > 0 &&
    Date.now() - new Date(data.last_fetched_at).getTime() < TAG_CACHE_MAX_AGE_MS;

  if (isFresh) return data!.tags as string[];

  const { tags } = await getTagsForApp(appid).catch(() => ({ tags: [] as string[] }));
  if (tags.length > 0) {
    if (data) {
      // Já existe um `games` row (jogo que alguém possui) -> só atualiza as tags.
      await admin
        .from("games")
        .update({ tags, last_fetched_at: new Date().toISOString() })
        .eq("appid", appid);
    } else {
      // Jogo em alta que ninguém do grupo tem ainda -> cria o cache do zero.
      await admin.from("games").insert({
        appid,
        name: fallbackName ?? `App ${appid}`,
        tags,
        last_fetched_at: new Date().toISOString(),
      });
    }
  }
  return tags;
}
