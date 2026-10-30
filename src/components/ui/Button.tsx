"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "accent-blue" | "accent-yellow" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-white text-purple-900 shadow-lg shadow-fuchsia-950/40",
  secondary: "bg-white/10 text-white hover:bg-white/20",
  "accent-blue": "bg-sky-400 text-indigo-950 shadow-lg shadow-sky-950/40",
  "accent-yellow": "bg-yellow-400 text-purple-950 shadow-lg shadow-yellow-950/40",
  ghost: "bg-transparent text-white/70 hover:text-white",
};

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
};

/** Botão com a animação de "pressionar" padrão do site — usa em toda ação clicável. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.035 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});
