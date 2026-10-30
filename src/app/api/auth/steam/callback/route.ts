import { NextRequest, NextResponse } from "next/server";
import { verifySteamCallback } from "@/lib/auth/steamOpenId";
import { setSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/env.server";
import { syncUserLibrary, upsertUserBySteamId } from "@/lib/steam/sync";

export async function GET(request: NextRequest) {
  const siteUrl = env.siteUrl;
  const failUrl = new URL("/?login=erro", siteUrl);

  const steamId64 = await verifySteamCallback(request.nextUrl.searchParams).catch(
    () => null
  );

  if (!steamId64) {
    return NextResponse.redirect(failUrl);
  }

  let userId: string;
  try {
    userId = await upsertUserBySteamId(steamId64);
  } catch (error) {
    console.error("[auth/steam/callback] falha ao salvar usuário:", error);
    return NextResponse.redirect(failUrl);
  }

  await setSessionCookie({ userId, steamId64 });

  // A sincronização da biblioteca não deve bloquear o login — se falhar, o perfil
  // mostra um botão pra tentar de novo.
  try {
    await syncUserLibrary(userId, steamId64);
  } catch (error) {
    console.error("[auth/steam/callback] falha ao sincronizar biblioteca:", error);
  }

  return NextResponse.redirect(new URL("/profile", siteUrl));
}
