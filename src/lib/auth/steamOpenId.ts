const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";

/**
 * Monta a URL de login da Steam (OpenID 2.0 — a Steam não tem OAuth2/"Sign in with
 * Steam" moderno, só esse fluxo clássico). `returnTo` é a URL de callback exata que a
 * Steam vai chamar de volta, `realm` é a origem do site.
 */
export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

/**
 * Verifica o callback da Steam. Isto é o passo crítico de segurança: a Steam manda os
 * parâmetros de volta via redirect do navegador (fácil de forjar), então precisamos
 * reenviar esses mesmos parâmetros pro servidor da Steam (server-to-server) e confirmar
 * que ela mesma os reconhece como válidos antes de confiar no steamid64.
 *
 * Retorna o steamid64 autenticado, ou null se a verificação falhar.
 */
export async function verifySteamCallback(
  searchParams: URLSearchParams
): Promise<string | null> {
  if (searchParams.get("openid.mode") !== "id_res") return null;

  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) return null;

  const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(
    claimedId
  );
  if (!match) return null;
  const steamId64 = match[1];

  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  if (!response.ok) return null;
  const body = await response.text();
  const isValid = body
    .split("\n")
    .some((line) => line.trim() === "is_valid:true");

  return isValid ? steamId64 : null;
}
