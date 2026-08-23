import { getNotificationIntegrationStatus } from "@/app/lib/notifications";

export async function GET() {
  return Response.json(getNotificationIntegrationStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
