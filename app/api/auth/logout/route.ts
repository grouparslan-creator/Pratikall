import { NextRequest, NextResponse } from "next/server";
import { clearSupabaseSession } from "@/app/lib/supabase-session";
export async function GET(request: NextRequest) {
  await clearSupabaseSession();
  const returnTo = request.nextUrl.searchParams.get("return_to");
  const safe = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/start";
  return NextResponse.redirect(new URL(safe, request.url), 303);
}
