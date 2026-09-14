import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginPage = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const loginRoute = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
const recoverRoute = await readFile(new URL("../app/api/auth/recover/route.ts", import.meta.url), "utf8");
const resetRoute = await readFile(new URL("../app/api/auth/reset-password/route.ts", import.meta.url), "utf8");
const resetForm = await readFile(new URL("../app/reset-password/reset-password-form.tsx", import.meta.url), "utf8");
const resendRoute = await readFile(new URL("../app/api/auth/resend-confirmation/route.ts", import.meta.url), "utf8");

test("login offers password recovery and explains unconfirmed email", () => {
  assert.match(loginPage, /Şifremi unuttum/);
  assert.match(loginPage, /Doğrulama e-postasını yeniden gönder/);
  assert.match(loginRoute, /email_not_confirmed/);
  assert.match(loginRoute, /error=unavailable/);
});

test("password recovery does not disclose whether an account exists", () => {
  assert.match(recoverRoute, /auth\/v1\/recover/);
  assert.match(recoverRoute, /forgot-password\?sent=1/);
  assert.doesNotMatch(recoverRoute, /user.*exists/i);
});

test("password reset consumes the recovery token without keeping it in the URL", () => {
  assert.match(resetForm, /window\.location\.hash/);
  assert.match(resetForm, /history\.replaceState/);
  assert.match(resetRoute, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(resetRoute, /method: "PUT"/);
  assert.match(resetRoute, /password_updated=1/);
});

test("signup confirmation can be safely requested again", () => {
  assert.match(resendRoute, /auth\/v1\/resend/);
  assert.match(resendRoute, /type: "signup"/);
  assert.match(resendRoute, /verify-email\?sent=1/);
});
