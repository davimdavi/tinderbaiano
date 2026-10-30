"use client";

import { useState } from "react";
import { steamLibraryCapsuleUrl } from "@/lib/steam/images";

type GameArtProps = {
  appid: number;
  headerImage?: string | null;
  iconUrl?: string | null;
  alt?: string;
  className?: string;
};

/**
 * Capa do jogo: tenta a capsule vertical em alta resolução da Steam primeiro e,
 * se não existir pra esse app (erro de carregamento), cai pro header e depois pro
 * ícone já salvos no banco — e só mostra "Sem imagem" se nenhum deles existir.
 */
export function GameArt({ appid, headerImage, iconUrl, alt = "", className = "" }: GameArtProps) {
  const sources = [steamLibraryCapsuleUrl(appid), headerImage, iconUrl].filter(
    (src): src is string => Boolean(src)
  );
  const [index, setIndex] = useState(0);

  if (index >= sources.length) {
    return (
      <div className={`flex items-center justify-center bg-white/10 text-white/40 ${className}`}>
        Sem imagem
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
