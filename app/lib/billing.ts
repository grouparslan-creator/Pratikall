type BillingEnvironment = { IYZICO_API_KEY?: string; IYZICO_SECRET_KEY?: string; IYZICO_SUBSCRIPTION_PLAN_CODE?: string; IYZICO_BASE_URL?: string };
function runtimeEnv() { const runtime = globalThis as typeof globalThis & { __SITE_ENV__?: BillingEnvironment }; return runtime.__SITE_ENV__ ?? {}; }
function configured(value: string | undefined) { return Boolean(value?.trim()); }
export function getBillingIntegrationStatus() {
  const env = runtimeEnv();
  const credentialsReady = configured(env.IYZICO_API_KEY) && configured(env.IYZICO_SECRET_KEY);
  const planReady = configured(env.IYZICO_SUBSCRIPTION_PLAN_CODE);
  return { provider: "İyzico Abonelik", ready: credentialsReady && planReady, credentialsReady, planReady, mode: env.IYZICO_BASE_URL?.includes("sandbox") ? "sandbox" : "production" } as const;
}
