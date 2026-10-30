/**
 * Capa vertical de alta resolução que a Steam usa na própria grade da biblioteca
 * (1200x1800 na variante @2x) — muito mais nítida que o `header.jpg` (460x215) que
 * vem do appdetails, que fica borrado quando esticado num card de swipe maior.
 * É um asset estático previsível pelo appid, sem precisar de outra chamada de API;
 * nem todo jogo (principalmente os mais antigos) tem esse arquivo, por isso o
 * componente que consome isso (GameArt) tem fallback em cascata.
 */
export function steamLibraryCapsuleUrl(appid: number): string {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900_2x.jpg`;
}
