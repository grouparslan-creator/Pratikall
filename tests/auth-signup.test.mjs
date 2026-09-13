import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const signupRoute = await readFile(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
const loginPage = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const sessionHelper = await readFile(new URL("../app/lib/supabase-session.ts", import.meta.url), "utf8");

test("signup accepts both current publishable and legacy anon key names", () => {
  assert.match(sessionHelper, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(sessionHelper, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test("signup handles configuration, network, and Supabase response failures", () => {
  assert.match(signupRoute, /error: "config"/);
  assert.match(signupRoute, /catch \{/);
  assert.match(signupRoute, /signupErrorCode\(data\)/);
});

test("signup failures are presented accessibly instead of as a generic login error", () => {
  assert.match(loginPage, /role="alert"/);
  assert.match(loginPage, /Yeni hesap oluşturma şu anda kapalı/);
  assert.match(loginPage, /zaten bir hesap bulunuyor/);
  assert.match(loginPage, /Kayıt servisi henüz yapılandırılmamış/);
});
