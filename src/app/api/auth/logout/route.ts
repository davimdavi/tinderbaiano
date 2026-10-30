import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/env.server";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", env.siteUrl));
}
