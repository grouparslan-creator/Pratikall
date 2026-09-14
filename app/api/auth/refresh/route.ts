import { NextRequest, NextResponse } from "next/server";
import {
  clearSupabaseSession,
  getSupabaseAuthConfig,
  getSupabaseRefreshToken,
  setSupabaseSession,
} from "@/app/lib/supabase-session";

function safeReturnPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("return_to"));
  const refreshToken = await getSupabaseRefreshToken();
  const { url, key } = getSupabaseAuthConfig();
  if (!refreshToken || !url || !key) {
    await clearSupabaseSession();
    return NextResponse.redirect(new URL(`/login?return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("refresh_failed");
    const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token || !data.refresh_token) throw new Error("refresh_invalid");
    await setSupabaseSession(data.access_token, data.refresh_token, data.expires_in ?? 3600);
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  } catch {
    await clearSupabaseSession();
    return NextResponse.redirect(new URL(`/login?expired=1&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }
}
