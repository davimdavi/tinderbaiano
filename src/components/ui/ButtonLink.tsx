"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentProps, CSSProperties } from "react";
import type { ButtonVariant } from "./Button";
import { BUTTON_VARIANT_COLORS } from "./Button";

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
  const c = BUTTON_VARIANT_COLORS[variant];
  const isGhost = variant === "ghost";

  return (
    <MotionLink
      whileHover={{ y: -2, filter: isGhost ? undefined : "brightness(1.12)" }}
      whileTap={{ y: 2, boxShadow: isGhost ? undefined : "1px 1px 0 var(--shadow-color)" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-center text-sm font-bold tracking-wide transition-colors duration-200 ${
        isGhost ? "hover:bg-white/10" : "border-[2.5px]"
      } ${className}`}
      style={
        {
          backgroundColor: c.bg,
          color: c.text,
          borderColor: c.border,
          boxShadow: isGhost ? undefined : "3px 3px 0 var(--shadow-color)",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </MotionLink>
  );
}
