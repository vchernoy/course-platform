import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "node:stream";
import { auth } from "@clerk/nextjs/server";
import { isSafeSlug } from "@/lib/slug";
import { canAccessCourse, getCurrentUserEmail } from "@/lib/authz";
import { mimeForFile, safeAssetFilePath } from "@/lib/course-assets";

type RouteCtx = { params: Promise<{ courseSlug: string; path: string[] }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { courseSlug, path: segments } = await ctx.params;

  if (!isSafeSlug(courseSlug)) {
    return new Response("Not found", { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const email = await getCurrentUserEmail();
  if (!canAccessCourse(email, courseSlug)) {
    return new Response("Forbidden", { status: 403 });
  }

  const filePath = safeAssetFilePath(courseSlug, segments);
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const st = await stat(filePath);
    if (!st.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const nodeStream = createReadStream(filePath);
    // Node's stream/web ReadableStream differs from the DOM BodyInit type in TS;
    // runtime behavior for streaming file bodies is correct.
    const webStream = Readable.toWeb(nodeStream) as unknown as BodyInit;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeForFile(filePath),
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(st.size),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
