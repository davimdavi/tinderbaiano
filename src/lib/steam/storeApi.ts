// Integrações não-oficiais da loja da Steam (sem contrato de SLA da Valve, mas
// estáveis e usadas por várias ferramentas da comunidade há anos). Ficam só no
// servidor e com cache em `games` pra não martelar a Steam.

const STORE_BASE = "https://store.steampowered.com";

export type StoreSearchResult = {
  appid: number;
  name: string;
  tinyImage: string | null;
};

type RawStoreSearchItem = {
  id: number;
  name: string;
  tiny_image?: string;
};

export async function searchStoreGames(
  term: string,
  limit = 20
): Promise<StoreSearchResult[]> {
  const url = new URL(`${STORE_BASE}/api/storesearch/`);
  url.searchParams.set("term", term);
  url.searchParams.set("l", "portuguese");
  url.searchParams.set("cc", "br");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Busca na Steam falhou (status ${res.status})`);
  }
  const data = await res.json();
  const items: RawStoreSearchItem[] = data.items ?? [];

  return items.slice(0, limit).map((item) => ({
    appid: item.id,
    name: item.name,
    tinyImage: item.tiny_image ?? null,
  }));
}

export type AppDetails = {
  appid: number;
  name: string;
  headerImage: string | null;
  genres: string[];
  /** Data ISO (YYYY-MM-DD) quando dá pra interpretar, null se "em breve"/ilegível. */
  releaseDate: string | null;
  releaseDateDisplay: string | null;
  isFree: boolean;
  /** Tem algum modo online (co-op online, PvP online, MMO...) — não conta local/split-screen. */
  isOnlineMultiplayer: boolean;
};

function hasOnlineMultiplayer(categories: { description?: string }[]): boolean {
  return categories.some((c) =>
    /online|mmo|massively multiplayer/i.test(c.description ?? "")
  );
}

export async function getAppDetails(appid: number): Promise<AppDetails | null> {
  const url = new URL(`${STORE_BASE}/api/appdetails`);
  url.searchParams.set("appids", String(appid));
  // Pedimos em inglês aqui (não pt-BR) porque precisamos interpretar a data de
  // lançamento como data de verdade (pra ordenar "lançamentos recentes"); o formato
  // em inglês da Steam ("13 Nov, 2024") é consistente o bastante pro Date.parse.
  url.searchParams.set("l", "english");
  url.searchParams.set("cc", "br");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  const entry = data?.[String(appid)];
  if (!entry?.success || !entry.data) return null;

  const d = entry.data;
  const rawDate: string | undefined = d.release_date?.date;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const releaseDate =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 10)
      : null;

  return {
    appid,
    name: d.name,
    headerImage: d.header_image ?? null,
    genres: Array.isArray(d.genres)
      ? d.genres.map((g: { description: string }) => g.description)
      : [],
    releaseDate,
    releaseDateDisplay: rawDate ?? null,
    isFree: Boolean(d.is_free),
    isOnlineMultiplayer: hasOnlineMultiplayer(
      Array.isArray(d.categories) ? d.categories : []
    ),
  };
}
