import { NextRequest, NextResponse } from "next/server";
import { clearSupabaseSession, getSupabaseAuthConfig } from "@/app/lib/supabase-session";

function resetRedirect(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const accessToken = String(form.get("access_token") ?? "");
  const password = String(form.get("password") ?? "");
  const passwordConfirm = String(form.get("password_confirm") ?? "");
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key || !accessToken) return resetRedirect(request, "reset_invalid");
  if (password.length < 8) return resetRedirect(request, "password");
  if (password !== passwordConfirm) return resetRedirect(request, "password_match");
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch {
    return resetRedirect(request, "unavailable");
  }
  if (!response.ok) return resetRedirect(request, "reset_invalid");
  await clearSupabaseSession();
  return NextResponse.redirect(new URL("/login?password_updated=1", request.url), 303);
}
