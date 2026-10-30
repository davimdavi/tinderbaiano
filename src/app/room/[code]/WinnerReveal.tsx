"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { MatchedGameView } from "@/lib/types";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getThemeAccentColors } from "@/lib/theme";

export function WinnerReveal({ game }: { game: MatchedGameView }) {
  useEffect(() => {
    const colors = getThemeAccentColors();
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.4 }, colors });
    const timer = setTimeout(
      () => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, colors }),
      350
    );
    return () => clearTimeout(timer);
  }, []);

  const image = game.headerImage ?? game.iconUrl;

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl bg-white/10 p-8 text-center">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-sm font-bold uppercase tracking-widest"
        style={{ color: "var(--accent-a)" }}
      >
        O jogo escolhido é...
      </motion.p>
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
        className="w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-white/10 text-white/40">
            Sem imagem
          </div>
        )}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-3xl font-extrabold"
      >
        {game.name}
      </motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <ButtonLink
          href={`https://store.steampowered.com/app/${game.appid}`}
          target="_blank"
          rel="noreferrer"
          variant="accent-blue"
        >
          Ver na Steam
        </ButtonLink>
      </motion.div>
    </div>
  );
}
