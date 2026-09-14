import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig, setSupabaseSession } from "@/app/lib/supabase-session";

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const returnTo = safeReturnTo(String(form.get("return_to") ?? "/app"));
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key || !email || !password) return NextResponse.redirect(new URL(`/login?error=missing&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.redirect(new URL(`/login?error=unavailable&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { code?: unknown; error_code?: unknown; message?: unknown; msg?: unknown };
    const code = String(failure.code ?? failure.error_code ?? "").toLowerCase();
    const message = String(failure.message ?? failure.msg ?? "").toLowerCase();
    const error = code.includes("email_not_confirmed") || message.includes("email not confirmed") ? "unconfirmed" : "invalid";
    return NextResponse.redirect(new URL(`/login?error=${error}&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }
  const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };
  await setSupabaseSession(data.access_token, data.refresh_token, data.expires_in);
  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
