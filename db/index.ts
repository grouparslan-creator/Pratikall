import postgres from "postgres";

export type D1AllResult<T> = { results: T[]; success: boolean };
export type D1RunResult = { success: boolean; changes: number; meta: { changes: number } };

export interface D1PreparedStatementCompat {
  bind(...params: unknown[]): D1PreparedStatementCompat;
  all<T = Record<string, unknown>>(): Promise<D1AllResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseCompat {
  prepare(sql: string): D1PreparedStatementCompat;
  batch(statements: D1PreparedStatementCompat[]): Promise<Array<{ results: unknown[]; success: boolean }>>;
}

type SqlExecutor = {
  unsafe: (query: string, params?: any[]) => Promise<any>;
};

class PostgresStatement implements D1PreparedStatementCompat {
  private params: unknown[] = [];
  constructor(private sqlText: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async all<T>(): Promise<D1AllResult<T>> {
    const rows = await executePostgres(this.sqlText, this.params);
    return { results: rows as T[], success: true };
  }

  async first<T>(): Promise<T | null> {
    const rows = await executePostgres(this.sqlText, this.params);
    return (rows[0] as T | undefined) ?? null;
  }

  async run(): Promise<D1RunResult> {
    const rows = await executePostgres(this.sqlText, this.params);
    const changes = Number((rows as any)?.count ?? rows.length ?? 0);
    return { success: true, changes, meta: { changes } };
  }

  async executeWith(executor: SqlExecutor) {
    const query = normalizeSql(this.sqlText);
    if (query.kind === "noop") return [];
    return executor.unsafe(toPgPlaceholders(query.sql), this.params as any[]);
  }
}

class PostgresD1Compat implements D1DatabaseCompat {
  prepare(sql: string) {
    return new PostgresStatement(sql);
  }

  async batch(statements: D1PreparedStatementCompat[]) {
    const sql = getPostgresClient();
    return sql.begin(async (tx: any) => {
      const results: Array<{ results: unknown[]; success: boolean }> = [];
      for (const statement of statements) {
        const rows = await (statement as PostgresStatement).executeWith(tx);
        results.push({ results: rows, success: true });
      }
      return results;
    });
  }
}

let pgClient: ReturnType<typeof postgres> | null = null;
let pgCompat: PostgresD1Compat | null = null;

function getPostgresClient() {
  if (pgClient) return pgClient;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");
  pgClient = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 15 });
  return pgClient;
}

function isPostgresBackend() {
  return Boolean(process.env.DATABASE_URL);
}

async function executePostgres(sqlText: string, params: unknown[]) {
  const normalized = normalizeSql(sqlText);
  if (normalized.kind === "noop") return [];
  const sql = getPostgresClient();
  return sql.unsafe(toPgPlaceholders(normalized.sql), params as any[]);
}

function toPgPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeSql(input: string): { kind: "query"; sql: string } | { kind: "noop" } {
  let sql = input.trim();
  if (/^(CREATE TABLE|CREATE INDEX|ALTER TABLE|PRAGMA\s+table_info)/i.test(sql)) return { kind: "noop" };

  const insertOrIgnore = /^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(sql);
  sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, "INSERT INTO ");
  if (insertOrIgnore && !/ON CONFLICT/i.test(sql)) sql += " ON CONFLICT DO NOTHING";

  sql = sql.replace(/MAX\(0,\s*current_debt\s*-\s*\?\)/gi, "GREATEST(0, current_debt - ?)");
  sql = sql.replace(/date\('now',\s*'-29 days'\)/gi, "(CURRENT_DATE - INTERVAL '29 days')");
  sql = sql.replace(/\bdate\s*>=\s*\(CURRENT_DATE - INTERVAL '29 days'\)/gi, "date::date >= (CURRENT_DATE - INTERVAL '29 days')");
  sql = sql.replace(/CURRENT_TIMESTAMP/gi, "to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')");
  sql = sql.replace(
    /datetime\(r\.due_at, '-' \|\| r\.email_lead_minutes \|\| ' minutes'\) <= datetime\(\?\)/gi,
    "(r.due_at::timestamp - (r.email_lead_minutes || ' minutes')::interval) <= ?::timestamp",
  );
  sql = sql.replace(
    /datetime\(r\.due_at\) >= datetime\(\?, '-7 days'\)/gi,
    "r.due_at::timestamp >= (?::timestamp - interval '7 days')",
  );
  sql = sql.replace(/ORDER BY datetime\(r\.due_at\) ASC/gi, "ORDER BY r.due_at::timestamp ASC");
  return { kind: "query", sql };
}

export function getD1(): D1DatabaseCompat {
  if (isPostgresBackend()) {
    pgCompat ??= new PostgresD1Compat();
    return pgCompat;
  }
  const runtime = globalThis as typeof globalThis & { __SITE_ENV__?: { DB?: any; BUCKET?: any } };
  const database = runtime.__SITE_ENV__?.DB;
  if (!database) throw new Error("Veritabanı bağlantısı kullanılamıyor.");
  return database as D1DatabaseCompat;
}

export function getR2(): any {
  const runtime = globalThis as typeof globalThis & { __SITE_ENV__?: { DB?: any; BUCKET?: any } };
  const bucket = runtime.__SITE_ENV__?.BUCKET;
  if (!bucket) throw new Error("Logo saklama alanı kullanılamıyor.");
  return bucket;
}

// Supabase şeması migrasyonla önceden kuruluyor. D1 tarafında mevcut güvenli kurulum davranışı korunuyor.
export async function ensureAnalyticsTables() { if (isPostgresBackend()) return; }
export async function ensureUserPreferencesTable() { if (isPostgresBackend()) return; }
export async function ensureNotificationResultColumns() { if (isPostgresBackend()) return; }
export async function ensureProfileModuleVersionColumn() { if (isPostgresBackend()) return; }
export async function ensurePersonalFinanceTables() { if (isPostgresBackend()) return; }
export async function ensureSupportReportsTable() { if (isPostgresBackend()) return; }
export async function ensureMembershipsTable() { if (isPostgresBackend()) return; }
export async function ensureReminderEmailDeliveriesTable() { if (isPostgresBackend()) return; }
