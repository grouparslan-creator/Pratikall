import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig, setSupabaseSession } from "@/app/lib/supabase-session";

type SignupError = { code?: string; error_code?: string; msg?: string; message?: string };

function signupErrorCode(error: SignupError) {
  const code = (error.code ?? error.error_code ?? "").toLowerCase();
  const message = (error.msg ?? error.message ?? "").toLowerCase();
  if (code.includes("over_email_send_rate_limit") || message.includes("rate limit")) return "rate_limit";
  if (code.includes("signup_disabled") || message.includes("signups not allowed")) return "disabled";
  if (code.includes("user_already_exists") || message.includes("already registered")) return "exists";
  if (code.includes("weak_password") || message.includes("password")) return "password";
  return "signup";
}

function loginRedirect(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key) return loginRedirect(request, { error: "config" });
  if (!email) return loginRedirect(request, { error: "email" });
  if (password.length < 8) return loginRedirect(request, { error: "password" });

  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return loginRedirect(request, { error: "unavailable" });
  }

  const data = (await response.json().catch(() => ({}))) as SignupError & {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!response.ok) return loginRedirect(request, { error: signupErrorCode(data) });
  if (data.access_token && data.refresh_token) {
    await setSupabaseSession(data.access_token, data.refresh_token, data.expires_in ?? 3600);
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }
  return loginRedirect(request, { created: "1" });
}
