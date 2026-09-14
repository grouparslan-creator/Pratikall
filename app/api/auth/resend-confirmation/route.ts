import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthConfig } from "@/app/lib/supabase-session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const { url, key } = getSupabaseAuthConfig();
  if (url && key && email) {
    try {
      await fetch(`${url}/auth/v1/resend`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "signup", email }),
        cache: "no-store",
      });
    } catch {}
  }
  return NextResponse.redirect(new URL("/verify-email?sent=1", request.url), 303);
}
