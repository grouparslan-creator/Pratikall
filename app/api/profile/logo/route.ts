import { getCurrentUserIdentity } from "@/app/user-identity";
import { ensureUserPreferencesTable, getD1, getR2 } from "@/db";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await ensureUserPreferencesTable();
    const form = await request.formData();
    const file = form.get("logo");

    if (!(file instanceof File)) {
      return Response.json({ error: "Bir logo dosyası seçin." }, { status: 400 });
    }
    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return Response.json(
        { error: "Logo PNG, JPG veya WebP biçiminde olmalıdır." },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > 2 * 1024 * 1024) {
      return Response.json(
        { error: "Logo dosyası 2 MB'dan küçük olmalıdır." },
        { status: 400 }
      );
    }

    const key = `brand-${crypto.randomUUID()}.${extension}`;
    await getR2().put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const result = await getD1()
      .prepare(
        `UPDATE user_preferences
         SET logo_key = ?, use_default_logo = 0, updated_at = CURRENT_TIMESTAMP
         WHERE user_key = ?`
      )
      .bind(key, identity.key)
      .run();

    if (!result.meta.changes) {
      return Response.json(
        { error: "Önce ilk kurulum bilgilerini kaydedin." },
        { status: 409 }
      );
    }

    return Response.json({
      logoUrl: `/api/brand-assets/${encodeURIComponent(key)}`,
      useDefaultLogo: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logo yüklenemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
