import fs from "fs/promises";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canAccessCourse, getCurrentUserEmail } from "@/lib/authz";
import { mimeForFile, safeAssetFilePath } from "@/lib/course-assets";

type RouteCtx = { params: Promise<{ courseSlug: string; path: string[] }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { courseSlug, path: segments } = await ctx.params;

  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const email = await getCurrentUserEmail();
  if (!canAccessCourse(email, courseSlug)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const filePath = safeAssetFilePath(courseSlug, segments);
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await fs.readFile(filePath);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mimeForFile(filePath),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
