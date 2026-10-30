"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { BracketMatchView, BracketRound } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

// O número de confrontos de uma rodada já diz o que ela é (1 confronto só pode ser
// a final, 2 só podem ser a semifinal etc.) — mais confiável do que tentar adivinhar
// quantas rodadas o mata-mata vai ter no total, já que isso só se sabe no fim.
function roundLabel(round: BracketRound): string {
  if (round.matches.length === 1) return "Final";
  if (round.matches.length === 2) return "Semifinal";
  if (round.matches.length === 4) return "Quartas de final";
  return `Rodada ${round.roundNumber}`;
}

export function BracketView({
  code,
  rounds,
  onVoted,
}: {
  code: string;
  rounds: BracketRound[];
  onVoted: () => void;
}) {
  if (rounds.length === 0) {
    return (
      <Panel className="p-8 text-center">
        <p className="font-display text-lg font-bold">Montando o mata-mata...</p>
      </Panel>
    );
  }

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-4">
      <div className="flex min-w-max gap-6">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="w-72 shrink-0">
            <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-white/70">
              {roundLabel(round)}
            </h2>
            <div className="flex flex-col gap-4">
              {round.matches.map((match) => (
                <BracketMatchCard key={match.id} code={code} match={match} onVoted={onVoted} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({
  code,
  match,
  onVoted,
}: {
  code: string;
  match: BracketMatchView;
  onVoted: () => void;
}) {
  const [voting, setVoting] = useState(false);
  const finalizedRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (match.status !== "voting" || !match.votingEndsAt) return;
    const endsAt = new Date(match.votingEndsAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !finalizedRef.current) {
        finalizedRef.current = true;
        fetch(`/api/rooms/${code}/bracket/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: match.id }),
        })
          .then(() => onVoted())
          .catch(() => {});
      }
    };

    // Dispara a primeira leitura num timer (não direto no corpo do effect) pra não
    // fazer setState síncrono durante o effect — o atraso é imperceptível.
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [code, match.id, match.status, match.votingEndsAt, onVoted]);

  // Bye: só um jogo, já passou direto.
  if (!match.gameB) {
    return (
      <Panel className="p-4 text-center">
        <GameTile game={match.gameA} highlighted />
        <p className="mt-2 text-xs font-semibold" style={{ color: "var(--accent-a)" }}>
          passou direto (bye)
        </p>
      </Panel>
    );
  }

  async function castVote(appid: number) {
    if (voting || match.status !== "voting") return;
    setVoting(true);
    await fetch(`/api/rooms/${code}/bracket/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, votedAppid: appid }),
    }).catch(() => {});
    setVoting(false);
    onVoted();
  }

  const decided = match.status === "decided";

  return (
    <Panel accent={decided ? "a" : "b"} className="p-4">
      <div className="flex items-center gap-2">
        <GameTile
          game={match.gameA}
          highlighted={decided && match.winnerAppid === match.gameA?.appid}
          faded={decided && match.winnerAppid !== match.gameA?.appid}
          votes={match.votesA}
          myVote={match.myVote === match.gameA?.appid}
        />
        <span className="font-display shrink-0 text-xs font-extrabold text-white/50">VS</span>
        <GameTile
          game={match.gameB}
          highlighted={decided && match.winnerAppid === match.gameB?.appid}
          faded={decided && match.winnerAppid !== match.gameB?.appid}
          votes={match.votesB}
          myVote={match.myVote === match.gameB?.appid}
        />
      </div>

      {!decided ? (
        <>
          <div className="mt-3 flex gap-2">
            <Button
              variant={match.myVote === match.gameA?.appid ? "accent-yellow" : "secondary"}
              disabled={voting}
              className="flex-1 px-2 py-1.5 text-xs"
              onClick={() => match.gameA && castVote(match.gameA.appid)}
            >
              Votar
            </Button>
            <Button
              variant={match.myVote === match.gameB?.appid ? "accent-yellow" : "secondary"}
              disabled={voting}
              className="flex-1 px-2 py-1.5 text-xs"
              onClick={() => match.gameB && castVote(match.gameB.appid)}
            >
              Votar
            </Button>
          </div>
          {secondsLeft !== null && (
            <p className="font-numeric mt-2 text-center text-xs text-white/50">
              {secondsLeft}s pra decidir
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-center text-xs font-semibold" style={{ color: "var(--accent-a)" }}>
          decidido
        </p>
      )}
    </Panel>
  );
}

function GameTile({
  game,
  highlighted,
  faded,
  votes,
  myVote,
}: {
  game: { appid: number; name: string; iconUrl: string | null; headerImage: string | null } | null;
  highlighted?: boolean;
  faded?: boolean;
  votes?: number;
  myVote?: boolean;
}) {
  if (!game) return <div className="h-20 flex-1 rounded-xl bg-white/5" />;
  const image = game.headerImage ?? game.iconUrl;

  return (
    <motion.div
      animate={{ scale: highlighted ? 1.03 : 1, opacity: faded ? 0.45 : 1 }}
      className={`relative flex-1 overflow-hidden rounded-xl ${
        highlighted
          ? "ring-2 ring-[var(--accent-a)]"
          : myVote
            ? "ring-2 ring-[var(--accent-b)]"
            : ""
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-20 w-full object-cover" />
      ) : (
        <div className="h-20 w-full bg-white/10" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1">
        <p className="truncate text-xs font-semibold text-white">{game.name}</p>
      </div>
      {typeof votes === "number" && votes > 0 && (
        <span
          className="font-numeric absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold"
          style={{ color: "var(--accent-a)" }}
        >
          {votes}
        </span>
      )}
    </motion.div>
  );
}
