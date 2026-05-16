import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "node:stream";
import { auth } from "@clerk/nextjs/server";
import { isSafeSlug } from "@/lib/slug";
import { canAccessOffering, getCurrentUserEmail } from "@/lib/authz";
import { mimeForFile, safeAssetFilePath } from "@/lib/offering-assets";
import { logDevWarning, logProdDiagnostic } from "@/lib/logger";

type RouteCtx = { params: Promise<{ offeringSlug: string; path: string[] }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { offeringSlug, path: segments } = await ctx.params;

  if (!isSafeSlug(offeringSlug)) {
    return new Response("Not found", { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const email = await getCurrentUserEmail();
  if (!canAccessOffering(email, offeringSlug)) {
    return new Response("Forbidden", { status: 403 });
  }

  const filePath = safeAssetFilePath(offeringSlug, segments);
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const st = await stat(filePath);
    if (!st.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as unknown as BodyInit;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeForFile(filePath),
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(st.size),
      },
    });
  } catch (err) {
    logDevWarning("offering-assets:get", err);
    logProdDiagnostic("offering-assets", "stream_failed");
    return new Response("Not found", { status: 404 });
  }
}
