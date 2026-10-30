"use client";

import { useMemo, useState } from "react";
import type { OwnedGameWithMeta } from "@/lib/types";

type SortKey = "playtime" | "recent" | "name";

const SORT_OPTIONS: [SortKey, string][] = [
  ["playtime", "Mais jogados"],
  ["recent", "Jogados recentemente"],
  ["name", "A-Z"],
];

export default function GameLibrary({ games }: { games: OwnedGameWithMeta[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("playtime");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...games];
    if (sortKey === "playtime") {
      copy.sort((a, b) => b.playtimeForever - a.playtimeForever);
    } else if (sortKey === "recent") {
      copy.sort((a, b) => b.playtime2Weeks - a.playtime2Weeks);
    } else {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [games, sortKey]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/steam/sync-library", { method: "POST" });
      if (!res.ok) throw new Error("sync failed");
      window.location.reload();
    } catch {
      setSyncError("Não foi possível sincronizar agora. Tenta de novo em breve.");
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {SORT_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                sortKey === key
                  ? "bg-white text-purple-900"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-full bg-fuchsia-500 px-3 py-1.5 text-sm font-semibold transition hover:bg-fuchsia-400 disabled:opacity-50"
        >
          {syncing ? "Sincronizando..." : "Atualizar biblioteca"}
        </button>
      </div>

      {syncError && <p className="mb-3 text-sm text-red-300">{syncError}</p>}

      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-white/10 p-6 text-center text-white/80">
          <p>
            Não encontramos jogos na sua biblioteca. Isso costuma acontecer quando o
            campo &quot;Detalhes do jogo&quot; do seu perfil Steam está privado — ajuste
            em steamcommunity.com → Editar perfil → Privacidade, e depois clique em
            &quot;Atualizar biblioteca&quot;.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((game) => (
            <li
              key={game.appid}
              className="flex items-center gap-3 rounded-xl bg-white/10 p-3"
            >
              {game.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.iconUrl}
                  alt=""
                  className="h-10 w-10 rounded-md"
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-white/20" />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{game.name}</p>
                <p className="text-xs text-white/60">
                  {Math.round(game.playtimeForever / 60)}h jogadas
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
