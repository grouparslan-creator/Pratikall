import { getD1 } from "@/db";
import { requireAdminIdentity } from "@/app/lib/admin-auth";
import { prepareOwnedData } from "@/app/lib/data-ownership";

export async function POST() {
  const admin = await requireAdminIdentity();
  if ("response" in admin) return admin.response;
  await prepareOwnedData(admin.identity.key);

  const db = getD1();
  const counts = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM accounts WHERE owner_key = ?").bind(admin.identity.key),
    db.prepare("SELECT COUNT(*) AS count FROM payments WHERE owner_key = ?").bind(admin.identity.key),
    db.prepare("SELECT COUNT(*) AS count FROM account_notifications WHERE owner_key = ?").bind(admin.identity.key),
  ]);

  await db.batch([
    db.prepare("DELETE FROM account_notifications WHERE owner_key = ?").bind(admin.identity.key),
    db.prepare("DELETE FROM payments WHERE owner_key = ?").bind(admin.identity.key),
    db.prepare("DELETE FROM accounts WHERE owner_key = ?").bind(admin.identity.key),
  ]);

  const countAt = (index: number) => Number((counts[index]?.results?.[0] as { count?: number } | undefined)?.count ?? 0);
  return Response.json({
    deleted: {
      accounts: countAt(0),
      payments: countAt(1),
      notifications: countAt(2),
    },
  });
}
