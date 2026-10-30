"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { MatchedGameView, PoolGameView, RoomMemberView } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SwipeCard, type SwipeCardHandle } from "./SwipeCard";

export function SwipingPhase({
  code,
  pool,
  members,
  matches,
  currentUserId,
  initialSwipedAppids,
  onRetry,
}: {
  code: string;
  pool: PoolGameView[];
  members: RoomMemberView[];
  matches: MatchedGameView[];
  currentUserId: string;
  initialSwipedAppids: number[];
  onRetry: () => Promise<void>;
}) {
  // `locallyMarked` guarda os swipes feitos nesta sessão antes do snapshot do
  // servidor confirmar (resposta otimista); `initialSwipedAppids` vem do servidor
  // (útil ao recarregar a página no meio de uma partida). A união dos dois decide
  // quais cartas já saíram do baralho, sem precisar de setState dentro de effect.
  const [locallyMarked, setLocallyMarked] = useState<Set<number>>(() => new Set());
  const [retrying, setRetrying] = useState(false);
  // Trava os botões ✕/♥ enquanto o card do topo está voando pra fora da tela, pra
  // um clique rápido demais não acertar o card errado antes do React trocar a
  // referência do topo do baralho.
  const [isDeciding, setIsDeciding] = useState(false);
  const topCardRef = useRef<SwipeCardHandle>(null);
  const prevMatchCount = useRef(matches.length);

  useEffect(() => {
    if (matches.length > prevMatchCount.current) {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#facc15", "#38bdf8", "#ec4899"],
      });
    }
    prevMatchCount.current = matches.length;
  }, [matches.length]);

  const swipedSet = useMemo(() => {
    const merged = new Set(initialSwipedAppids);
    for (const appid of locallyMarked) merged.add(appid);
    return merged;
  }, [initialSwipedAppids, locallyMarked]);

  const deck = pool.filter((g) => !swipedSet.has(g.appid));
  const visibleStack = deck.slice(0, 3);

  function handleDecision(appid: number, liked: boolean) {
    setLocallyMarked((prev) => new Set(prev).add(appid));
    setIsDeciding(false);
    fetch(`/api/rooms/${code}/swipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appid, liked }),
    }).catch(() => {});
  }

  function decideTopCard(liked: boolean) {
    if (isDeciding) return;
    setIsDeciding(true);
    topCardRef.current?.decide(liked);
  }

  async function handleRetry() {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  }

  const myProgress = swipedSet.size;
  const total = pool.length;
  const unfinishedOthers = members.filter(
    (m) => m.userId !== currentUserId && m.swipedCount < total
  );
  const allMembersDone = members.every((m) => m.swipedCount >= total);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-white/70">
        <span>
          Seu progresso: {Math.min(myProgress, total)} de {total}
        </span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-yellow-400"
          animate={{ width: `${total > 0 ? (Math.min(myProgress, total) / total) * 100 : 0}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {deck.length > 0 ? (
        <>
          <div className="relative mx-auto mb-6 h-[420px] w-full max-w-sm">
            <AnimatePresence>
              {visibleStack
                .map((game, i) => (
                  <SwipeCard
                    key={game.appid}
                    ref={i === 0 ? topCardRef : undefined}
                    game={game}
                    isTop={i === 0}
                    stackIndex={i}
                    onDecided={(liked) => handleDecision(game.appid, liked)}
                  />
                ))
                .reverse()}
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              className="h-14 w-14 rounded-full text-2xl"
              disabled={isDeciding}
              onClick={() => decideTopCard(false)}
            >
              ✕
            </Button>
            <Button
              variant="accent-yellow"
              className="h-14 w-14 rounded-full text-2xl"
              disabled={isDeciding}
              onClick={() => decideTopCard(true)}
            >
              ♥
            </Button>
          </div>
        </>
      ) : !allMembersDone ? (
        <div className="rounded-2xl bg-white/10 p-8 text-center">
          <p className="font-display text-lg font-bold">Você terminou de swipar!</p>
          <p className="mt-2 text-sm text-white/70">
            Esperando:{" "}
            {unfinishedOthers.map((m) => m.personaName ?? "alguém").join(", ")}
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl bg-white/10 p-8 text-center">
          <p className="font-display text-lg font-bold">Ninguém bateu o olho em nada 😅</p>
          <p className="mt-2 text-sm text-white/70">
            Ninguém curtiu o mesmo jogo dessa vez. Bora tentar de novo?
          </p>
          <Button
            onClick={handleRetry}
            disabled={retrying}
            variant="accent-yellow"
            className="mt-4"
          >
            {retrying ? "Reiniciando..." : "Tentar de novo"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/10 p-8 text-center">
          <p className="font-display text-lg font-bold">Fechando o resultado...</p>
        </div>
      )}
    </div>
  );
}
