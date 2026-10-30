"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OwnedGameWithMeta } from "@/lib/types";
import type { RoomSnapshot } from "@/lib/rooms/service";
import { subscribeToRoom } from "@/lib/supabase/realtime";
import { Button } from "@/components/ui/Button";
import PoolCuration from "./PoolCuration";

const STATUS_LABEL: Record<string, string> = {
  curating_pool: "Montando o pool",
  swiping: "Dando swipe",
  bracket: "Mata-mata",
  finished: "Resultado",
};

export default function RoomView({
  code,
  currentUserId,
  initialSnapshot,
  initialIsMember,
  myLibrary,
}: {
  code: string;
  currentUserId: string;
  initialSnapshot: RoomSnapshot;
  initialIsMember: boolean;
  myLibrary: OwnedGameWithMeta[];
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [joining, setJoining] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copiar código");

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (!res.ok) return;
    const data = await res.json();
    setSnapshot({ room: data.room, members: data.members, pool: data.pool });
    setIsMember(data.isMember);
  }, [code]);

  useEffect(() => {
    if (!isMember) return;
    const unsubscribe = subscribeToRoom(snapshot.room.id, currentUserId, {
      onChange: refetch,
      onPresenceChange: setOnlineIds,
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, snapshot.room.id, currentUserId]);

  const poolAppids = useMemo(
    () => new Set(snapshot.pool.map((g) => g.appid)),
    [snapshot.pool]
  );

  const me = snapshot.members.find((m) => m.userId === currentUserId);

  async function handleJoin() {
    setJoining(true);
    const res = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
    if (res.ok) {
      await refetch();
    }
    setJoining(false);
  }

  async function toggleReady() {
    if (!me) return;
    await fetch(`/api/rooms/${code}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ready: !me.isReady }),
    });
  }

  async function handleRemove(appid: number) {
    await fetch(`/api/rooms/${code}/pool?appid=${appid}`, { method: "DELETE" });
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopyLabel("Copiado!");
      setTimeout(() => setCopyLabel("Copiar código"), 1500);
    });
  }

  if (!isMember) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 text-center text-white">
        <h1 className="font-display animate-rise text-3xl font-extrabold">Sala {code}</h1>
        {snapshot.room.status === "curating_pool" ? (
          <>
            <p className="text-white/80">Você ainda não entrou nessa sala.</p>
            <Button
              onClick={handleJoin}
              disabled={joining}
              variant="primary"
              className="px-8 py-3 text-lg"
            >
              {joining ? "Entrando..." : "Entrar na sala"}
            </Button>
          </>
        ) : (
          <p className="text-white/80">
            Essa sala já começou e não dá mais pra entrar agora.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="animate-rise mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">
              {STATUS_LABEL[snapshot.room.status] ?? snapshot.room.status}
            </p>
            <h1 className="font-display text-3xl font-extrabold">Sala {code}</h1>
          </div>
          <Button onClick={copyCode} variant="secondary" className="px-4 py-2">
            {copyLabel}
          </Button>
        </header>

        <ul className="animate-rise mb-6 flex flex-wrap gap-3 [animation-delay:80ms]">
          {snapshot.members.map((member) => (
            <li
              key={member.userId}
              className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors ${
                member.isHost
                  ? "bg-yellow-400/15 ring-1 ring-yellow-300/40"
                  : "bg-white/10"
              }`}
            >
              <span className="relative">
                {member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <span className="block h-7 w-7 rounded-full bg-white/20" />
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-purple-800 ${
                    onlineIds.includes(member.userId) ? "bg-green-400" : "bg-white/30"
                  }`}
                />
              </span>
              <span className="text-sm font-semibold">
                {member.personaName ?? "Jogador"}
                {member.isHost && " 👑"}
              </span>
              {member.isReady && (
                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-bold text-yellow-300">
                  pronto
                </span>
              )}
            </li>
          ))}
        </ul>

        {snapshot.room.status === "curating_pool" ? (
          <>
            <div className="animate-rise mb-6 flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-4 [animation-delay:120ms]">
              <p className="text-sm text-white/80">
                {snapshot.pool.length} jogo(s) no pool. Quando todo mundo marcar
                &quot;pronto&quot; (com pelo menos 2 jogos), o swipe começa sozinho.
              </p>
              <Button
                onClick={toggleReady}
                variant={me?.isReady ? "secondary" : "accent-yellow"}
                className="shrink-0 px-5 py-2.5"
              >
                {me?.isReady ? "Cancelar pronto" : "Estou pronto"}
              </Button>
            </div>

            {snapshot.pool.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display mb-2 text-sm font-bold uppercase tracking-wide text-white/70">
                  Pool da sala
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {snapshot.pool.map((game) => (
                      <motion.li
                        key={game.appid}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5"
                      >
                        {game.iconUrl || game.headerImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.headerImage ?? game.iconUrl ?? undefined}
                            alt=""
                            className="h-9 w-14 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-9 w-14 rounded-md bg-white/20" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{game.name}</p>
                          <p className="text-xs text-white/50">
                            add. por {game.addedByName ?? "alguém"}
                          </p>
                        </div>
                        {game.addedByUserId === currentUserId && (
                          <button
                            onClick={() => handleRemove(game.appid)}
                            className="shrink-0 text-xs text-white/50 transition-colors hover:text-red-300"
                          >
                            remover
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )}

            <PoolCuration
              code={code}
              poolAppids={poolAppids}
              myLibrary={myLibrary}
              onAdded={refetch}
            />
          </>
        ) : (
          <div className="rounded-2xl bg-white/10 p-8 text-center">
            <p className="text-lg font-semibold">
              {STATUS_LABEL[snapshot.room.status] ?? snapshot.room.status} — em breve!
            </p>
            <p className="mt-2 text-sm text-white/70">
              Essa fase ainda está sendo construída.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
