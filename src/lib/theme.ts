"use client";

/**
 * Lê as cores de destaque do tema ativo já calculadas (canvas-confetti não entende
 * `var(--x)`, precisa de cor de verdade). Só funciona no navegador.
 */
export function getThemeAccentColors(): string[] {
  if (typeof window === "undefined") return ["#facc15", "#38bdf8", "#f472b6"];
  const styles = getComputedStyle(document.documentElement);
  return ["--accent-a", "--accent-b", "--accent-c"].map(
    (name) => styles.getPropertyValue(name).trim() || "#facc15"
  );
}
