"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentProps, CSSProperties } from "react";
import type { ButtonVariant } from "./Button";

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

const MotionLink = motion.create(Link);

type ButtonLinkProps = Omit<
  ComponentProps<typeof Link>,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  variant?: ButtonVariant;
};

/** Mesmo visual/animação do Button, pra links que navegam (ex: CTAs). */
export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  style,
  ...props
}: ButtonLinkProps) {
  const c = VARIANT_COLORS[variant];
  const cssVars = {
    "--btn-border": c.border,
    "--btn-text": c.text,
    "--btn-fill": c.fill,
    "--btn-ink": c.ink,
    ...style,
  } as CSSProperties;

  return (
    <MotionLink
      whileHover={{ y: -2 }}
      whileTap={{ y: 2, boxShadow: "1px 1px 0 var(--shadow-color)" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[var(--btn-border)] px-6 py-3 text-center text-sm font-bold tracking-wide text-[var(--btn-text)] transition-colors duration-200 group-hover:text-[var(--btn-ink)] ${className}`}
      style={{ ...cssVars, boxShadow: "3px 3px 0 var(--shadow-color)" }}
      {...props}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 bg-[var(--btn-fill)] transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
      <span className="relative z-10">{children}</span>
    </MotionLink>
  );
}
