"use client";

import { motion } from "framer-motion";

const CARD_COLORS = ["var(--accent-c)", "var(--accent-b)", "var(--accent-a)"];

/** Animação de "baralho embaralhando" pra usar no lugar de um spinner genérico. */
export function ArcadeLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      <div className="relative h-16 w-12">
        {CARD_COLORS.map((color, i) => (
          <motion.div
            key={color}
            className="absolute inset-0 rounded-lg"
            style={{ backgroundColor: color, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}
            animate={{
              y: [0, -16, 0],
              rotate: [0, i % 2 === 0 ? -14 : 14, 0],
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.p
        className="text-sm font-semibold text-white/80"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {label}
      </motion.p>
    </div>
  );
}
