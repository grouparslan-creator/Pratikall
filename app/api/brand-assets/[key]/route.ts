import { getR2 } from "@/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  if (!/^brand-[a-f0-9-]+\.(png|jpg|webp)$/i.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getR2().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
