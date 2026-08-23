import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig, setSupabaseSession } from "@/app/lib/supabase-session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key || !email || password.length < 8) return NextResponse.redirect(new URL("/login?error=signup", request.url), 303);
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return NextResponse.redirect(new URL("/login?error=signup", request.url), 303);
  const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (data.access_token && data.refresh_token) {
    await setSupabaseSession(data.access_token, data.refresh_token, data.expires_in ?? 3600);
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }
  return NextResponse.redirect(new URL("/login?created=1", request.url), 303);
}
