"use client";

import { useMemo, useState } from "react";
import type { OwnedGameWithMeta } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

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
            <Button
              key={key}
              onClick={() => setSortKey(key)}
              variant={sortKey === key ? "primary" : "secondary"}
              className="px-3 py-1.5"
            >
              {label}
            </Button>
          ))}
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="accent-blue" className="px-3 py-1.5">
          {syncing ? "Sincronizando..." : "Atualizar biblioteca"}
        </Button>
      </div>

      {syncError && <p className="mb-3 text-sm text-red-300">{syncError}</p>}

      {sorted.length === 0 ? (
        <Panel className="p-6 text-center text-white/80">
          <p>
            Não encontramos jogos na sua biblioteca. Isso costuma acontecer quando o
            campo &quot;Detalhes do jogo&quot; do seu perfil Steam está privado — ajuste
            em steamcommunity.com → Editar perfil → Privacidade, e depois clique em
            &quot;Atualizar biblioteca&quot;.
          </p>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sorted.map((game) => (
            <li
              key={game.appid}
              className="flex items-center gap-3 rounded-lg border-l-[3px] bg-black/20 p-3 transition-colors hover:bg-black/30"
              style={{ borderLeftColor: "var(--accent-a)" }}
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
