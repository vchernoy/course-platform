# Course platform

Small LMS prototype: course metadata in YAML under `content/courses`, lesson bodies in MDX, rendered with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote). Course chrome (module/lesson sidebar) lives in [`app/courses/[courseSlug]/layout.tsx`](app/courses/[courseSlug]/layout.tsx). **Courses require [Clerk](https://clerk.com/) sign-in** and an email allowlist in [`config/students.yaml`](config/students.yaml).

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.13+ (recommended for Next.js 16 / ESLint tooling)
- A [Clerk](https://dashboard.clerk.com/) application (free tier is fine)

## Clerk setup

1. In the [Clerk Dashboard](https://dashboard.clerk.com/), create an application (or pick an existing one).
2. Under **Configure → API keys**, copy the **Publishable key** and **Secret key**.
3. Create `.env.local` in the project root (same folder as `package.json`). You can start from [`.env.example`](.env.example):

   ```bash
   cp .env.example .env.local
   ```

4. Set:

   - **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** — publishable key (safe to expose to the browser).
   - **`CLERK_SECRET_KEY`** — secret key (server-only; never commit to git).

5. Under **Configure → Paths**, ensure redirect URLs match your app (for local dev, `http://localhost:3000` is typical). If Clerk asks for sign-in/sign-up URLs, use **`/sign-in`** and **`/sign-up`** (these routes exist in this repo).

6. **Authentication strategies**: Prefer **OAuth** and/or **passwordless email** (magic link or verification code). In Clerk (**Configure → User authentication → Authentication strategies**), **disable the Password strategy** so users never see password fields. Our UI copy avoids passwords; Clerk wording still follows what you enable in the dashboard.

7. **Create test users** in Clerk (**Users → Create user**) with emails that match [`config/students.yaml`](config/students.yaml) for authorized testing, and another email **not** listed there for unauthorized testing.

Restart `npm run dev` after changing `.env.local`.

## Production notes

- **404:** [`app/not-found.tsx`](app/not-found.tsx) for missing routes and `notFound()` from course/lesson loaders.
- **403:** [`app/forbidden.tsx`](app/forbidden.tsx) when a signed-in user is not on the course allowlist (`forbidden()` from [`app/courses/[courseSlug]/layout.tsx`](app/courses/[courseSlug]/layout.tsx)).
- **Headers:** [`next.config.ts`](next.config.ts) applies baseline headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, etc.).
- **Logging:** [`lib/logger.ts`](lib/logger.ts) avoids dumping PII; the course-assets API logs coarse codes in production only.

## Environment variables

| Variable | Required | Where |
|----------|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | `.env.local` |
| `CLERK_SECRET_KEY` | Yes | `.env.local` |

Optional:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Defaults to `/sign-in` if unset |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Defaults to `/sign-up` if unset |
| `NEXT_PUBLIC_SHOW_SIGN_UP_LINK` | Set to `false` to hide the home page **Sign up** link (use when Clerk sign-ups are disabled). Omit or any other value shows the link. |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER` | Optional. Host like `customer-xxxxx.cloudflarestream.com` for [`VideoPlayer`](components/mdx/VideoPlayer.tsx) Cloudflare embeds. If unset, `iframe.videodelivery.net` is used. |
| `NEXT_PUBLIC_CLOUDFLARE_DEMO_PLAYBACK_ID` | Optional. Populates the Cloudflare branch of the legacy [`ProtectedVideo`](components/mdx/ProtectedVideo.tsx) mapping for `risk-return-overview`. Prefer explicit `playbackId` on `<VideoPlayer />` in real content. |

`.env.local` is gitignored; use [`.env.example`](.env.example) as a template.

## Course assets and media

### Lesson images (filesystem)

- Put files under **`content/courses/<courseSlug>/assets/`** (e.g. [`content/courses/investing-basics/assets/`](content/courses/investing-basics/assets/)).
- From a lesson MDX file inside `module-*`, reference them with a **relative** path:

  `![Alt text](../assets/your-file.png)`

  That path is rewritten at render time to an authenticated URL served by [`app/api/course-assets/[courseSlug]/[...path]/route.ts`](app/api/course-assets/[courseSlug]/[...path]/route.ts).

- Or use the MDX component (filename is under the same `assets/` folder):

  `<CourseImage src="your-file.png" alt="Description" />`

Only users who pass the same **Clerk + [`students.yaml`](config/students.yaml)** checks as the course pages can load these URLs.

### Video embeds

**Choosing a provider:** [**Vimeo**](https://vimeo.com/) is convenient for an MVP—quick uploads and a familiar dashboard—while iframe playback stays simple public embeds (not DRM). [**Cloudflare Stream**](https://www.cloudflare.com/developer-platform/products/cloudflare-stream/) is the preferred long-term direction here for signed URLs, token-gated playback, and platform alignment; this repo still uses plain iframe embeds with `playbackId` until you wire signing server-side. **Both providers remain first-class:** pick per lesson via `VideoPlayer` props or the `ProtectedVideo` registry—do not standardize on a single provider in code.

Supported **`VideoPlayer`** providers (see [`components/mdx/VideoPlayer.tsx`](components/mdx/VideoPlayer.tsx)):

| Provider | Props | Notes |
|----------|--------|--------|
| **Vimeo** | `provider="vimeo"`, `videoId`, optional `title`, `privacyHash` | `privacyHash` maps to Vimeo’s private/unlisted `h=` parameter. Not enterprise DRM. |
| **Cloudflare Stream** | `provider="cloudflare"`, `playbackId`, optional `title` | Optional env **`NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER`** for custom iframe host; otherwise uses `iframe.videodelivery.net`. Signed URLs/tokens are not implemented in this prototype. |

Optional **`poster`** is accepted for future use; iframe embeds ignore it today.

**`<ProtectedVideo assetId="..." />`** maps known IDs to **either** provider’s `VideoPlayerProps` (sample course mixes Vimeo and Cloudflare). Prefer **`VideoPlayer`** with explicit props in new MDX. For the bundled **`risk-return-overview`** asset, set **`NEXT_PUBLIC_CLOUDFLARE_DEMO_PLAYBACK_ID`** or swap the lesson to an explicit `<VideoPlayer provider="cloudflare" playbackId="..." />`.

In the sample **investing-basics** modules, lesson 1 embeds Vimeo via `<VideoPlayer />` directly; lesson 2 uses `<ProtectedVideo />` → Cloudflare (`playbackId` from env or the amber placeholder message); lesson 3 uses `<ProtectedVideo />` → Vimeo.

## Students allowlist (`config/students.yaml`)

- Defines which **email addresses** may access which **course slugs** (matching the folder name under `content/courses/<courseSlug>`).
- Emails are compared case-insensitively after trim.
- Authorization runs **on the server** in [`lib/authz.ts`](lib/authz.ts) (`canAccessCourse`) using data loaded by [`lib/students.ts`](lib/students.ts).
- The signed-in user’s **primary Clerk email** is used; if none, the first **verified** email is used (see `getCurrentUserEmail`).
- Edit the YAML and refresh; no database sync—Clerk users and this file must agree manually.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Signed out:** you should see “Sign in to access courses”, a **Sign in** button, and optionally **Need an account? Sign up** (unless `NEXT_PUBLIC_SHOW_SIGN_UP_LINK=false` — see the **Environment variables** table). **Signed in:** “Welcome back”, your email, **Open lesson 1**, and **Sign out**.

Then open a course lesson (e.g. [lesson 1](http://localhost:3000/courses/investing-basics/lesson-1)). In **`npm run dev`** only, a footer note appears on course pages: **Access controlled by config/students.yaml**. It does **not** appear after `npm run build` / production.

### How to test access

**a) Authorized student**

1. Ensure the user’s email appears in [`config/students.yaml`](config/students.yaml) under `courses` including `investing-basics` (open that file for the current allowlist).
2. Sign in as that user.
3. Visit `/courses/investing-basics/lesson-1` (or use **Open lesson 1** on the home page). You should see the course sidebar and lesson content.

**b) Unauthorized student**

1. Sign in with a Clerk user whose email is **not** in `students.yaml` (or remove their email from the file).
2. Visit `/courses/investing-basics/lesson-1`.
3. You should see **You do not have access to this course** (HTTP 403 via [`app/forbidden.tsx`](app/forbidden.tsx)) and a **Sign out** button (middleware still requires sign-in for `/courses/*`).

## Content layout

- `content/courses/<courseSlug>/course.yaml` — course title and modules (validated at load time).
- `content/courses/<courseSlug>/<moduleSlug>/<lessonSlug>.mdx` — lesson MDX (must match `module.slug` and lesson `slug` from YAML).

### MDX components

These tags are wired in [`app/courses/[courseSlug]/[lessonSlug]/page.tsx`](app/courses/[courseSlug]/[lessonSlug]/page.tsx):

- `<CompoundInterestCalculator />`
- Markdown images: `![alt](../assets/file.png)` (see **Course assets and media**)
- `<CourseImage src="file.png" alt="..." />`
- `<VideoPlayer provider="vimeo" videoId="..." title="..." />` or `provider="cloudflare" playbackId="..."`
- `<ProtectedVideo assetId="..." />` (legacy; delegates to `VideoPlayer`)
- `<DownloadFile assetId="..." />`

### Adding a new lesson

1. Edit `content/courses/<courseSlug>/course.yaml` — under the right module `lessons` list, add `{ slug: lesson-x, title: "..." }`. Use a unique `slug` within the course.
2. Add the file `content/courses/<courseSlug>/<moduleSlug>/<lessonSlug>.mdx` (same `moduleSlug` as in YAML and same `lessonSlug` as in the entry).
3. Use MDX components as needed (`CompoundInterestCalculator`, `CourseImage`, `VideoPlayer`, `ProtectedVideo`, `DownloadFile`).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Serve production   |
| `npm run lint` | ESLint (`eslint .`) |

## Out of scope

No database, Stripe/Telegram integrations, or real video/file protection yet. Auth is Clerk + local YAML allowlist only.
