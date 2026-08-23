import Home from "../dashboard";
import { requireChatGPTUser } from "../chatgpt-auth";
import { prepareOwnedData } from "../lib/data-ownership";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireChatGPTUser("/app");
  await prepareOwnedData(user.email.trim().toLowerCase());
  return <Home />;
}
