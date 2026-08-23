import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = new URL("../", import.meta.url);

test("legacy migration preserves rows and adds ownership", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE accounts (id TEXT PRIMARY KEY);
    CREATE TABLE payments (id TEXT PRIMARY KEY);
    CREATE TABLE account_notifications (id TEXT PRIMARY KEY);
    CREATE TABLE credit_cards (id TEXT PRIMARY KEY);
    CREATE TABLE loans (id TEXT PRIMARY KEY);
    CREATE TABLE finance_payments (id TEXT PRIMARY KEY);
    INSERT INTO accounts VALUES ('legacy-account');
    INSERT INTO payments VALUES ('legacy-payment');
    INSERT INTO account_notifications VALUES ('legacy-notification');
    INSERT INTO credit_cards VALUES ('legacy-card');
    INSERT INTO loans VALUES ('legacy-loan');
    INSERT INTO finance_payments VALUES ('legacy-finance-payment');
  `);

  const migration = await readFile(new URL("drizzle/0010_odd_nightmare.sql", root), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }

  for (const table of ["accounts", "payments", "account_notifications", "credit_cards", "loans", "finance_payments"]) {
    const row = db.prepare(`SELECT owner_key AS ownerKey FROM ${table}`).get();
    assert.equal(row.ownerKey, "site-owner");
    db.prepare(`UPDATE ${table} SET owner_key = ? WHERE owner_key = ?`).run("admin@example.com", "site-owner");
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_key = ?`).get("admin@example.com").count, 1);
  }
});

test("owned records are isolated by owner key", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE accounts (id TEXT PRIMARY KEY, owner_key TEXT NOT NULL, customer_name TEXT NOT NULL)");
  const insert = db.prepare("INSERT INTO accounts VALUES (?, ?, ?)");
  insert.run("a1", "user-a@example.com", "A kaydı");
  insert.run("b1", "user-b@example.com", "B kaydı");
  const rows = db.prepare("SELECT id FROM accounts WHERE owner_key = ? ORDER BY id").all("user-a@example.com");
  assert.deepEqual(rows.map((row) => row.id), ["a1"]);
  const crossTenantUpdate = db.prepare("UPDATE accounts SET customer_name = 'değişti' WHERE id = ? AND owner_key = ?").run("b1", "user-a@example.com");
  assert.equal(crossTenantUpdate.changes, 0);
});

test("all shared-finance API routes enforce ownership", async () => {
  const files = [
    "app/api/accounts/route.ts",
    "app/api/accounts/[id]/payments/route.ts",
    "app/api/accounts/[id]/notifications/route.ts",
    "app/api/credit-cards/route.ts",
    "app/api/credit-cards/[id]/pay/route.ts",
    "app/api/loans/route.ts",
    "app/api/loans/[id]/pay/route.ts",
    "app/api/personal-finance/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.match(source, /getCurrentUserIdentity/);
    assert.match(source, /prepareOwnedData/);
    assert.match(source, /owner_key/);
  }
});

test("admin destructive action requires explicit admin authorization and ownership scope", async () => {
  const source = await readFile(new URL("app/api/admin/purge-customer-data/route.ts", root), "utf8");
  assert.match(source, /requireAdminIdentity/);
  assert.doesNotMatch(source, /DELETE FROM accounts["`)]/);
  assert.match(source, /DELETE FROM accounts WHERE owner_key = \?/);
});

test("legacy claim is restricted, guarded, atomic, and triggered by /app", async () => {
  const ownership = await readFile(new URL("app/lib/data-ownership.ts", root), "utf8");
  const appPage = await readFile(new URL("app/app/page.tsx", root), "utf8");

  assert.match(ownership, /VERIFIED_PROJECT_OWNER = "grouparslan@gmail\.com"/);
  assert.match(ownership, /LEGACY_RECORD_COUNT = 16/);
  assert.match(ownership, /if \(legacyCount === 0\) return/);
  assert.match(ownership, /if \(legacyCount !== LEGACY_RECORD_COUNT\)/);
  assert.match(ownership, /await db\.batch\(OWNED_TABLES\.map\(update\)\)/);
  assert.doesNotMatch(ownership, /ownerKey !== primaryAdminEmail\(\)/);
  assert.match(appPage, /requireChatGPTUser\("\/app"\)/);
  assert.match(appPage, /await prepareOwnedData\(user\.email\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(appPage, /dynamic = "force-dynamic"/);
});
