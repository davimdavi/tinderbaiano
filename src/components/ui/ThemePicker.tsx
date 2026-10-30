"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "tb-theme";

const THEMES: { id: string; label: string; swatch: [string, string, string] }[] = [
  { id: "fliperama", label: "Fliperama", swatch: ["#a21caf", "#facc15", "#38bdf8"] },
  { id: "noturno", label: "Noturno", swatch: ["#1e1b4b", "#22d3ee", "#f472b6"] },
  { id: "tutti-frutti", label: "Tutti-Frutti", swatch: ["#ea580c", "#facc15", "#fb7185"] },
  { id: "mar-aberto", label: "Mar Aberto", swatch: ["#0f766e", "#a3e635", "#fb923c"] },
  { id: "choque-rosa", label: "Choque de Rosa", swatch: ["#db2777", "#22d3ee", "#fde047"] },
];

/**
 * Seletor de tema flutuante — cada jogador escolhe a própria paleta (salva só no
 * navegador dele via localStorage, não afeta os outros). Reaplica o tema salvo assim
 * que monta (o servidor não tem como saber qual é, por isso o `suppressHydrationWarning`
 * no <html>) — aceita um leve flash em vez de um <script beforeInteractive>, que
 * conflitava com o render de Server Components no App Router.
 */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  // Lê direto no estado inicial (sem effect): o popover começa fechado de qualquer
  // jeito, então esse valor não aparece na primeira pintura — não tem risco de
  // divergir do HTML renderizado no servidor.
  const [active, setActive] = useState<string>(() => {
    if (typeof window === "undefined") return "fliperama";
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "fliperama";
    } catch {
      return "fliperama";
    }
  });

  useEffect(() => {
    if (active === "fliperama") return;
    document.documentElement.setAttribute("data-theme", active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTheme(id: string) {
    setActive(id);
    setOpen(false);
    if (id === "fliperama") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // sem storage -> troca só vale pra essa visita.
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="mb-3 flex flex-col gap-1 rounded-2xl border-2 border-white/20 p-2 shadow-xl"
            style={{ backgroundColor: "var(--bg-3)" }}
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className={`flex items-center gap-3 rounded-full px-3 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10 ${
                  active === theme.id ? "bg-white/10 ring-2 ring-white/40" : ""
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/30">
                  {theme.swatch.map((color, i) => (
                    <span key={i} className="h-full w-1/3" style={{ backgroundColor: color }} />
                  ))}
                </span>
                {theme.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Trocar tema de cores"
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 text-xl shadow-lg"
        style={{ backgroundColor: "var(--bg-2)", boxShadow: "3px 3px 0 var(--shadow-color)" }}
      >
        🎨
      </motion.button>
    </div>
  );
}
