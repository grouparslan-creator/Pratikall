import { getD1 } from "@/db";

const LEGACY_OWNER_KEY = "site-owner";
const VERIFIED_PROJECT_OWNER = "grouparslan@gmail.com";
const LEGACY_RECORD_COUNT = 16;
const OWNED_TABLES = [
  "accounts",
  "payments",
  "account_notifications",
  "credit_cards",
  "loans",
  "finance_payments",
] as const;

type RuntimeEnvironment = { ADMIN_EMAILS?: string };

function runtimeEnvironment() {
  const runtime = globalThis as typeof globalThis & { __SITE_ENV__?: RuntimeEnvironment };
  return runtime.__SITE_ENV__ ?? {};
}

export function configuredAdminEmails() {
  return new Set(
    (runtimeEnvironment().ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isConfiguredAdmin(email: string) {
  return configuredAdminEmails().has(email.trim().toLowerCase());
}

export function primaryAdminEmail() {
  return configuredAdminEmails().values().next().value ?? "";
}

let legacyClaim: Promise<void> | null = null;

export async function claimLegacyDataForAdmin(ownerKey: string) {
  const normalizedOwnerKey = ownerKey.trim().toLowerCase();
  if (normalizedOwnerKey !== VERIFIED_PROJECT_OWNER) return;
  if (!legacyClaim) {
    const db = getD1();
    legacyClaim = (async () => {
      const countSql = OWNED_TABLES.map(
        (table) => `SELECT COUNT(*) AS count FROM ${table} WHERE owner_key = ?`,
      );
      const before = await db.batch(
        countSql.map((sql) => db.prepare(sql).bind(LEGACY_OWNER_KEY)),
      );
      const legacyCount = before.reduce(
        (total: number, result: { results?: unknown[] }) => total + Number((result.results?.[0] as { count?: number } | undefined)?.count ?? 0),
        0,
      );

      // A completed claim is intentionally a no-op on every later request.
      if (legacyCount === 0) return;
      if (legacyCount !== LEGACY_RECORD_COUNT) {
        throw new Error("Eski kayıt sahipliği doğrulanamadı; aktarım yapılmadı.");
      }

      const invariant = OWNED_TABLES.map(
        (table) => `(SELECT COUNT(*) FROM ${table} WHERE owner_key IN (?, ?))`,
      ).join(" + ");
      const update = (table: (typeof OWNED_TABLES)[number]) =>
        db.prepare(
          `UPDATE ${table}
           SET owner_key = ?
           WHERE owner_key = ? AND (${invariant}) = ?`,
        ).bind(
          normalizedOwnerKey,
          LEGACY_OWNER_KEY,
          ...OWNED_TABLES.flatMap(() => [LEGACY_OWNER_KEY, normalizedOwnerKey]),
          LEGACY_RECORD_COUNT,
        );

      // D1 batch executes as one transaction: an error rolls back every update.
      await db.batch(OWNED_TABLES.map(update));

      const after = await db.batch(
        OWNED_TABLES.flatMap((table) => [
          db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_key = ?`).bind(LEGACY_OWNER_KEY),
          db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_key = ?`).bind(normalizedOwnerKey),
        ]),
      );
      const remainingLegacy = after
        .filter((_: { results?: unknown[] }, index: number) => index % 2 === 0)
        .reduce((total: number, result: { results?: unknown[] }) => total + Number((result.results?.[0] as { count?: number } | undefined)?.count ?? 0), 0);
      const claimed = after
        .filter((_: { results?: unknown[] }, index: number) => index % 2 === 1)
        .reduce((total: number, result: { results?: unknown[] }) => total + Number((result.results?.[0] as { count?: number } | undefined)?.count ?? 0), 0);
      if (remainingLegacy !== 0 || claimed !== LEGACY_RECORD_COUNT) {
        throw new Error("Eski kayıt sahipliği doğrulanamadı.");
      }
    })().catch((error) => {
      legacyClaim = null;
      throw error;
    });
  }
  await legacyClaim;
}

export async function prepareOwnedData(ownerKey: string) {
  await claimLegacyDataForAdmin(ownerKey);
  return ownerKey;
}
