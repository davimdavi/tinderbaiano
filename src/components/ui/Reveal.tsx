"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
};

/**
 * Um único momento de entrada orquestrado por tela: o grupo revela seus filhos
 * `RevealItem` em sequência (stagger), em vez de cada elemento animar sozinho com
 * delays soltos no className.
 *
 * (Exports nomeados separados, não `Reveal.Item` — anexar uma propriedade estática
 * num componente de função quebra o Fast Refresh do Turbopack em dev.)
 */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className = "",
  ...props
}: Omit<HTMLMotionProps<"div">, "variants"> & { children: ReactNode }) {
  return (
    <motion.div variants={item} className={className} {...props}>
      {children}
    </motion.div>
  );
}
