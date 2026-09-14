import { cookies } from "next/headers";

const ACCESS_COOKIE = "pratikall_sb_access";
const REFRESH_COOKIE = "pratikall_sb_refresh";

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
}
function publishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function supabaseAuthReady() {
  return Boolean(supabaseUrl() && publishableKey());
}

export async function getSupabaseSessionUser() {
  if (!supabaseAuthReady()) return null;
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: publishableKey(),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } };
  if (!user.email) return null;
  return {
    id: user.id ?? user.email,
    email: user.email.trim().toLowerCase(),
    fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  };
}

export async function setSupabaseSession(accessToken: string, refreshToken: string, expiresIn: number) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, expiresIn - 30),
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSupabaseSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getSupabaseRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export function getSupabaseAuthConfig() {
  return { url: supabaseUrl(), key: publishableKey() };
}
