import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig } from "@/app/lib/supabase-session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const { url, key } = getSupabaseAuthConfig();
  if (!url || !key || !email) return NextResponse.redirect(new URL("/forgot-password?error=request", request.url), 303);
  const redirectTo = new URL("/reset-password", request.url).toString();
  try {
    await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.redirect(new URL("/forgot-password?error=request", request.url), 303);
  }
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
}
