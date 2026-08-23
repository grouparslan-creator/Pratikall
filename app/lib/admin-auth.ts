import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isConfiguredAdmin } from "@/app/lib/data-ownership";

export async function requireAdminIdentity() {
  const user = await getChatGPTUser();
  if (!user) return { response: Response.json({ error: "Oturum gerekli." }, { status: 401 }) } as const;
  const key = user.email.trim().toLowerCase();
  if (!isConfiguredAdmin(key)) {
    return { response: Response.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 }) } as const;
  }
  return { identity: { key, displayName: user.fullName ?? user.displayName } } as const;
}
