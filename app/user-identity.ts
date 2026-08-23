import { headers } from "next/headers";
import { identityFromHeaders } from "@/app/lib/platform-identity";
import { getSupabaseSessionUser } from "@/app/lib/supabase-session";

export async function getCurrentUserIdentity() {
  const platform = identityFromHeaders(await headers());
  if (platform.key !== "site-owner") return platform;
  const supabase = await getSupabaseSessionUser();
  if (supabase) return { key: supabase.email, displayName: supabase.fullName ?? supabase.email };
  return platform;
}
