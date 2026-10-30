"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import type { ButtonVariant } from "./Button";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-white text-purple-900 shadow-lg shadow-fuchsia-950/40",
  secondary: "bg-white/10 text-white hover:bg-white/20",
  "accent-blue": "bg-sky-400 text-indigo-950 shadow-lg shadow-sky-950/40",
  "accent-yellow": "bg-yellow-400 text-purple-950 shadow-lg shadow-yellow-950/40",
  ghost: "bg-transparent text-white/70 hover:text-white",
};

const MotionLink = motion.create(Link);

type ButtonLinkProps = Omit<
  ComponentProps<typeof Link>,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  variant?: ButtonVariant;
};

/** Mesma animação de "pressionar" do Button, pra links que navegam (ex: CTAs). */
export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <MotionLink
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`inline-block rounded-full px-6 py-3 text-center text-sm font-bold ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </MotionLink>
  );
}
