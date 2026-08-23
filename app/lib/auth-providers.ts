type AuthEnvironment = {
  AUTH_GOOGLE_START_URL?: string;
  AUTH_EMAIL_START_URL?: string;
};

function runtimeEnv() {
  const runtime = globalThis as typeof globalThis & { __SITE_ENV__?: AuthEnvironment };
  return runtime.__SITE_ENV__ ?? {};
}

function safeHttpsUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function getAuthProviderStatus() {
  const env = runtimeEnv();
  const googleUrl = safeHttpsUrl(env.AUTH_GOOGLE_START_URL);
  const emailUrl = safeHttpsUrl(env.AUTH_EMAIL_START_URL);
  return { googleUrl, emailUrl, googleReady: Boolean(googleUrl), emailReady: Boolean(emailUrl) };
}
