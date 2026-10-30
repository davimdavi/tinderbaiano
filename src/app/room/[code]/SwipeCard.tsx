"use client";

import { forwardRef, useImperativeHandle } from "react";
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import type { PoolGameView } from "@/lib/types";
import { GameArt } from "@/components/ui/GameArt";

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 500;

export type SwipeCardHandle = {
  decide: (liked: boolean) => void;
};

export const SwipeCard = forwardRef<
  SwipeCardHandle,
  { game: PoolGameView; isTop: boolean; stackIndex: number; onDecided: (liked: boolean) => void }
>(function SwipeCard({ game, isTop, stackIndex, onDecided }, ref) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  function decide(liked: boolean) {
    controls.start({
      x: liked ? 650 : -650,
      opacity: 0,
      transition: { duration: 0.32, ease: "easeIn" },
    });
    // Dispara via timer (não via Promise da animação, que pode não resolver de
    // forma confiável aqui) — o importante é a UI avançar pro próximo card no
    // tempo certo, a animação de saída roda em paralelo por conta própria.
    setTimeout(() => onDecided(liked), 320);
  }

  useImperativeHandle(ref, () => ({ decide }));

  const releaseYear = game.releaseDate ? game.releaseDate.slice(0, 4) : null;
  const topGenres = (game.genres ?? []).slice(0, 3);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const liked = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
    const disliked =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;
    if (liked) {
      decide(true);
    } else if (disliked) {
      decide(false);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 32 } });
    }
  }

  return (
    <motion.div
      className="absolute inset-0 flex touch-none select-none flex-col overflow-hidden rounded-3xl bg-white/10 shadow-2xl"
      style={{ x, rotate }}
      animate={controls}
      initial={{ scale: 1 - stackIndex * 0.04, y: stackIndex * 10, opacity: stackIndex > 2 ? 0 : 1 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      <div className="relative min-h-0 flex-1 bg-black/30">
        <GameArt
          appid={game.appid}
          headerImage={game.headerImage}
          iconUrl={game.iconUrl}
          className="h-full w-full object-cover"
        />
        <motion.div
          style={{ opacity: likeOpacity, borderColor: "var(--accent-a)", color: "var(--accent-a)" }}
          className="absolute left-4 top-4 -rotate-12 rounded-xl border-4 px-3 py-1 text-xl font-extrabold"
        >
          CURTI
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute right-4 top-4 rotate-12 rounded-xl border-4 border-pink-400 px-3 py-1 text-xl font-extrabold text-pink-400"
        >
          PASSO
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
          <p className="font-display text-xl font-bold text-white">
            {game.name}
            {releaseYear && (
              <span className="font-numeric ml-2 text-base font-normal text-white/70">
                {releaseYear}
              </span>
            )}
          </p>
          {(topGenres.length > 0 || game.isFree) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {game.isFree && (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
                  style={{ borderColor: "var(--accent-a)", color: "var(--accent-a)" }}
                >
                  Grátis
                </span>
              )}
              {topGenres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/35 bg-black/30 px-2.5 py-0.5 text-xs font-semibold text-white/85"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
