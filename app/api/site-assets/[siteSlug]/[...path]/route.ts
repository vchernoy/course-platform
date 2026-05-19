import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "node:stream";
import { auth } from "@clerk/nextjs/server";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { logDevWarning, logProdDiagnostic } from "@/lib/logger";
import { mimeForFile } from "@/lib/offering-assets";
import { safeSiteAssetFilePath } from "@/lib/site-assets";
import { isPublicSite, loadSite } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type RouteCtx = { params: Promise<{ siteSlug: string; path: string[] }> };

/**
 * Site asset access mirrors site visibility:
 * - **Public / unlisted** (`isPublicSite`): assets are served **without** Clerk — intentional, because the site
 *   HTML on `/s/*` is already public; asset URLs are not a separate confidentiality boundary.
 * - **Private**: requires signed-in Clerk + **`canAdminAccessSite`** (same scope as `/admin/sites/[slug]`).
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { siteSlug, path: segments } = await ctx.params;

  if (!isSafeSlug(siteSlug)) {
    return new Response("Not found", { status: 404 });
  }

  let site;
  try {
    site = loadSite(siteSlug);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const isPublic = isPublicSite(site);

  if (!isPublic) {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const email = await getCurrentUserEmail();
    if (!canAdminAccessSite(email, siteSlug)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const filePath = safeSiteAssetFilePath(siteSlug, segments);
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  const cacheControl = isPublic ? "public, max-age=3600" : "private, max-age=3600";

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
        "Cache-Control": cacheControl,
        "Content-Length": String(st.size),
      },
    });
  } catch (err) {
    logDevWarning("site-assets:get", err);
    logProdDiagnostic("site-assets", "stream_failed");
    return new Response("Not found", { status: 404 });
  }
}
