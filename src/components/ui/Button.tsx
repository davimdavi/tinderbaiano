"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "accent-blue" | "accent-yellow" | "ghost";

type VariantColors = { bg: string; text: string; border: string };

export const BUTTON_VARIANT_COLORS: Record<ButtonVariant, VariantColors> = {
  primary: { bg: "var(--accent-a)", text: "var(--accent-a-ink)", border: "var(--panel-bg)" },
  "accent-yellow": {
    bg: "var(--accent-a)",
    text: "var(--accent-a-ink)",
    border: "var(--panel-bg)",
  },
  "accent-blue": { bg: "var(--accent-b)", text: "var(--accent-b-ink)", border: "var(--panel-bg)" },
  secondary: { bg: "#ffffff", text: "var(--bg-3)", border: "var(--panel-bg)" },
  ghost: { bg: "transparent", text: "rgba(255,255,255,0.75)", border: "transparent" },
};

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  children?: ReactNode;
};

/**
 * Botão "cápsula de arcade": já vem preenchido com a cor do tema e contorno escuro,
 * como a borda de um botão físico de fliperama — nada de preencher só no hover, que
 * deixava o texto invisível quando a tinta e o preenchimento coincidiam. No hover só
 * clareia e levanta; ao clicar, afunda.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, style, ...props },
  ref
) {
  const c = BUTTON_VARIANT_COLORS[variant];
  const isGhost = variant === "ghost";

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, filter: isGhost ? undefined : "brightness(1.12)" }}
      whileTap={
        disabled
          ? undefined
          : { y: 2, boxShadow: isGhost ? undefined : "1px 1px 0 var(--shadow-color)" }
      }
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold tracking-wide transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 ${
        isGhost ? "hover:bg-white/10" : "border-[2.5px]"
      } ${className}`}
      style={
        {
          backgroundColor: c.bg,
          color: c.text,
          borderColor: c.border,
          boxShadow: isGhost || disabled ? undefined : "3px 3px 0 var(--shadow-color)",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </motion.button>
  );
});
