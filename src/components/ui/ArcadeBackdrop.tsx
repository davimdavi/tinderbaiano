/**
 * Camada decorativa fixa por trás do conteúdo — bolhas desfocadas + formas
 * geométricas flutuando/girando, nas cores de destaque do tema ativo. Puramente
 * visual (pointer-events-none), pra deixar o site com aquele clima de fliperama
 * sem atrapalhar a leitura nem o clique em nada.
 */
export function ArcadeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="animate-blob absolute -left-24 top-10 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: "var(--accent-b)" }}
      />
      <div
        className="animate-blob absolute -right-20 bottom-10 h-80 w-80 rounded-full opacity-20 blur-3xl [animation-delay:4s]"
        style={{ backgroundColor: "var(--accent-a)" }}
      />
      <div
        className="animate-drift absolute left-[8%] top-[18%] h-10 w-10 rounded-full border-4 opacity-40"
        style={{ borderColor: "var(--accent-c)" }}
      />
      <div
        className="animate-drift absolute right-[12%] top-[62%] h-8 w-8 rotate-45 border-4 opacity-40 [animation-delay:2s]"
        style={{ borderColor: "var(--accent-a)" }}
      />
      <div
        className="animate-spin-slow absolute right-[18%] top-[10%] h-14 w-14 rounded-full border-[3px] border-dashed opacity-30"
        style={{ borderColor: "var(--accent-b)" }}
      />
      <div
        className="animate-drift absolute left-[15%] bottom-[14%] h-6 w-6 rounded-full opacity-40 [animation-delay:3s]"
        style={{ backgroundColor: "var(--accent-c)" }}
      />
    </div>
  );
}
