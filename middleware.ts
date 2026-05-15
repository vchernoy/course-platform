import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isCourseRoute = createRouteMatcher(["/courses(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isCourseRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
