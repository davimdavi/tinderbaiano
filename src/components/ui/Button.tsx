"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "accent-blue" | "accent-yellow" | "ghost";

type VariantColors = { border: string; text: string; fill: string; ink: string };

const VARIANT_COLORS: Record<ButtonVariant, VariantColors> = {
  primary: {
    border: "var(--accent-a)",
    text: "var(--accent-a)",
    fill: "var(--accent-a)",
    ink: "var(--accent-a-ink)",
  },
  "accent-yellow": {
    border: "var(--accent-a)",
    text: "var(--accent-a)",
    fill: "var(--accent-a)",
    ink: "var(--accent-a-ink)",
  },
  "accent-blue": {
    border: "var(--accent-b)",
    text: "var(--accent-b)",
    fill: "var(--accent-b)",
    ink: "var(--accent-b-ink)",
  },
  secondary: {
    border: "rgba(255,255,255,0.65)",
    text: "#ffffff",
    fill: "#ffffff",
    ink: "var(--bg-3)",
  },
  ghost: {
    border: "transparent",
    text: "rgba(255,255,255,0.7)",
    fill: "transparent",
    ink: "#ffffff",
  },
};

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  children?: ReactNode;
};

/**
 * Botão com visual de arcade: borda chapada + sombra sólida, e um preenchimento de
 * cor que "varre" o botão da esquerda pra direita ao passar o mouse (o texto muda
 * pra cor de tinta por cima). Ao clicar, o botão "afunda" (sombra encolhe) pra dar
 * aquela sensação de botão físico.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, style, ...props },
  ref
) {
  const c = VARIANT_COLORS[variant];
  const isGhost = variant === "ghost";

  const cssVars = {
    "--btn-border": c.border,
    "--btn-text": c.text,
    "--btn-fill": c.fill,
    "--btn-ink": c.ink,
    ...style,
  } as CSSProperties;

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={
        disabled
          ? undefined
          : { y: 2, boxShadow: isGhost ? undefined : "1px 1px 0 var(--shadow-color)" }
      }
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2.5 text-sm font-bold tracking-wide text-[var(--btn-text)] transition-[color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-40 ${
        isGhost ? "" : "border-[2.5px] border-[var(--btn-border)]"
      } ${isGhost ? "hover:text-white" : "group-hover:text-[var(--btn-ink)]"} ${className}`}
      style={{
        ...cssVars,
        boxShadow: isGhost || disabled ? undefined : "3px 3px 0 var(--shadow-color)",
      }}
      {...props}
    >
      {!isGhost && (
        <span
          aria-hidden
          className="absolute inset-0 origin-left scale-x-0 bg-[var(--btn-fill)] transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
});
