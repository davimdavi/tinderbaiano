"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { OwnedGameWithMeta } from "@/lib/types";
import type { StoreSearchResult } from "@/lib/steam/storeApi";
import type { RecommendedGame } from "@/lib/discovery/recommendations";
import { Button } from "@/components/ui/Button";
import { ArcadeLoader } from "@/components/ui/ArcadeLoader";

type Tab = "library" | "recommend" | "search";

const TABS: [Tab, string][] = [
  ["library", "Minha biblioteca"],
  ["recommend", "Recomendados pra vocês"],
  ["search", "Buscar na Steam"],
];

type AddPayload = {
  appid: number;
  name: string;
  iconUrl?: string | null;
  headerImage?: string | null;
  genres?: string[] | null;
  releaseDate?: string | null;
  isFree?: boolean | null;
};

function AddableGameRow({
  appid,
  name,
  imageUrl,
  subtitle,
  isInPool,
  onAdd,
  wide,
}: {
  appid: number;
  name: string;
  imageUrl: string | null;
  subtitle?: string;
  isInPool: boolean;
  onAdd: () => void;
  wide?: boolean;
}) {
  return (
    <motion.li
      key={appid}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-3 rounded-xl bg-white/10 p-3 transition-colors hover:bg-white/15 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-10 w-16 rounded-md object-cover" />
      ) : (
        <div className="h-10 w-16 rounded-md bg-white/20" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
      </div>
      <Button
        onClick={onAdd}
        disabled={isInPool}
        variant={isInPool ? "secondary" : "accent-yellow"}
        className="shrink-0 px-3 py-1.5 text-xs"
      >
        {isInPool ? "Adicionado" : "Adicionar"}
      </Button>
    </motion.li>
  );
}

export default function PoolCuration({
  code,
  poolAppids,
  myLibrary,
  onAdded,
}: {
  code: string;
  poolAppids: Set<number>;
  myLibrary: OwnedGameWithMeta[];
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<Tab>("library");

  async function addGame(payload: AddPayload) {
    await fetch(`/api/rooms/${code}/pool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    onAdded();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Button
            key={key}
            onClick={() => setTab(key)}
            variant={tab === key ? "primary" : "secondary"}
            className="px-3 py-1.5"
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "library" && (
        <LibraryTab myLibrary={myLibrary} poolAppids={poolAppids} onAdd={addGame} />
      )}
      {tab === "recommend" && (
        <RecommendTab code={code} poolAppids={poolAppids} onAdd={addGame} />
      )}
      {tab === "search" && (
        <SearchTab code={code} poolAppids={poolAppids} onAdd={addGame} />
      )}
    </div>
  );
}

function LibraryTab({
  myLibrary,
  poolAppids,
  onAdd,
}: {
  myLibrary: OwnedGameWithMeta[];
  poolAppids: Set<number>;
  onAdd: (payload: AddPayload) => void;
}) {
  const sorted = useMemo(
    () => [...myLibrary].sort((a, b) => b.playtimeForever - a.playtimeForever),
    [myLibrary]
  );

  if (sorted.length === 0) {
    return (
      <p className="rounded-2xl bg-white/10 p-6 text-center text-white/80">
        Sua biblioteca ainda não sincronizou. Vai no seu perfil e clica em &quot;Atualizar
        biblioteca&quot;.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sorted.map((game) => (
        <AddableGameRow
          key={game.appid}
          appid={game.appid}
          name={game.name}
          imageUrl={game.iconUrl}
          subtitle={`${Math.round(game.playtimeForever / 60)}h jogadas`}
          isInPool={poolAppids.has(game.appid)}
          onAdd={() =>
            onAdd({ appid: game.appid, name: game.name, iconUrl: game.iconUrl })
          }
        />
      ))}
    </ul>
  );
}

function SearchTab({
  code,
  poolAppids,
  onAdd,
}: {
  code: string;
  poolAppids: Set<number>;
  onAdd: (payload: AddPayload) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<StoreSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmedTerm = term.trim();

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/rooms/${code}/search?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [term, code]);

  const visibleResults = trimmedTerm.length < 2 ? [] : results;

  return (
    <div>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Nome do jogo..."
        className="mb-4 w-full rounded-full bg-white/20 px-4 py-2.5 text-sm text-white placeholder-white/50 outline-none transition-colors focus:bg-white/30 focus:ring-2 focus:ring-[var(--accent-b)]"
      />
      {loading && <ArcadeLoader label="Procurando na Steam..." />}
      {!loading && trimmedTerm.length >= 2 && visibleResults.length === 0 && (
        <p className="text-sm text-white/60">Nada encontrado.</p>
      )}
      {!loading && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleResults.map((game) => (
            <AddableGameRow
              key={game.appid}
              appid={game.appid}
              name={game.name}
              imageUrl={game.tinyImage}
              isInPool={poolAppids.has(game.appid)}
              onAdd={() =>
                onAdd({ appid: game.appid, name: game.name, iconUrl: game.tinyImage })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type RecommendSort = "popular" | "recent";
const PAGE_SIZE = 10;

const RECOMMEND_LOADING_MESSAGES = [
  "Espiando o que a galera mais joga...",
  "Cruzando os gostos da sala...",
  "Garimpando jogos em alta...",
];

function RecommendTab({
  code,
  poolAppids,
  onAdd,
}: {
  code: string;
  poolAppids: Set<number>;
  onAdd: (payload: AddPayload) => void;
}) {
  const [games, setGames] = useState<RecommendedGame[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<RecommendSort>("popular");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMessage] = useState(
    () =>
      RECOMMEND_LOADING_MESSAGES[
        Math.floor(Math.random() * RECOMMEND_LOADING_MESSAGES.length)
      ]
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${code}/recommendations`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setGames(data.results ?? []);
        }
      })
      .catch(() => !cancelled && setError("Não deu pra carregar recomendações."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const sorted = useMemo(() => {
    if (!games) return [];
    const copy = [...games];
    if (sort === "recent") {
      copy.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    } else {
      copy.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    return copy;
  }, [games, sort]);

  if (loading) {
    return <ArcadeLoader label={loadingMessage} />;
  }

  if (error) {
    return <p className="rounded-2xl bg-white/10 p-6 text-center text-white/80">{error}</p>;
  }

  if (!sorted || sorted.length === 0) {
    return (
      <p className="rounded-2xl bg-white/10 p-6 text-center text-white/80">
        Ainda não achei recomendações — adiciona alguns jogos na biblioteca de vocês
        primeiro, ou tenta de novo daqui a pouco.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => setSort("popular")}
          variant={sort === "popular" ? "primary" : "secondary"}
          className="px-3 py-1.5"
        >
          Mais populares
        </Button>
        <Button
          onClick={() => setSort("recent")}
          variant={sort === "recent" ? "primary" : "secondary"}
          className="px-3 py-1.5"
        >
          Lançamentos recentes
        </Button>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.slice(0, visibleCount).map((game) => (
          <AddableGameRow
            key={game.appid}
            appid={game.appid}
            name={game.name}
            imageUrl={game.headerImage}
            subtitle={game.releaseDateDisplay ?? game.genres.join(", ") ?? undefined}
            isInPool={poolAppids.has(game.appid)}
            wide
            onAdd={() =>
              onAdd({
                appid: game.appid,
                name: game.name,
                headerImage: game.headerImage,
                genres: game.genres,
                releaseDate: game.releaseDate,
                isFree: game.isFree,
              })
            }
          />
        ))}
      </ul>
      {visibleCount < sorted.length && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="px-5 py-2"
          >
            Mostrar mais ({sorted.length - visibleCount})
          </Button>
        </div>
      )}
    </div>
  );
}
