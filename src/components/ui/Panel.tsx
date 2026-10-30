import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Qual cor de destaque borda o painel — "a" (padrão) domina a tela. */
  accent?: "a" | "b" | "c";
};

/**
 * O "monitor" — painel-moldura sólido (nada de vidro fosco) com a mesma física
 * chapada dos botões: borda grossa + sombra sólida. Usa isso no lugar de
 * `bg-white/10 rounded-2xl` em qualquer bloco de conteúdo.
 */
export function Panel({ children, className = "", accent = "a", style, ...props }: PanelProps) {
  return (
    <div
      className={`panel ${className}`}
      style={{ borderColor: `var(--accent-${accent})`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
