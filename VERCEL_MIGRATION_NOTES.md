# PratikAll Vercel + Supabase preview

This package is derived from the PratikAll v32 source and is intended for the isolated `pratikall-preview` Vercel project.

Required Vercel environment variables:
- `DATABASE_URL` (Supabase Transaction Pooler connection string; keep secret)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_EMAILS` (recommended for admin routes)

Key migration changes:
- Standard Next.js build (`next build`) for Vercel.
- Existing D1 `prepare/bind/all/first/run/batch` call sites are preserved through a PostgreSQL compatibility adapter.
- SQLite-specific SQL used by reminders, analytics and card balances is normalized for PostgreSQL.
- Supabase email/password auth is available through `/login` and server-side httpOnly session cookies.
- ChatGPT Sites identity remains supported when the same source runs on the original Sites runtime.
- Cloudflare Worker/Vinext-only sources are excluded from the Vercel TypeScript build.
- Existing `owner_key` / `user_key` filters remain in application queries.

Known preview limitation:
- R2-backed custom logo upload/read remains a Cloudflare feature. Existing exported data contains no active R2 object key, so the default PratikAll logo is unaffected. Storage migration can be completed after the preview app is stable.
