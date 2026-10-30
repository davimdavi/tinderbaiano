import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth/steamOpenId";
import { env } from "@/lib/env.server";

export async function GET() {
  const siteUrl = env.siteUrl;
  const returnTo = new URL("/api/auth/steam/callback", siteUrl).toString();
  const redirectUrl = buildSteamLoginUrl(returnTo, siteUrl);
  return NextResponse.redirect(redirectUrl);
}
