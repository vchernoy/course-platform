# Course platform

Small LMS prototype: **offerings** (courses, webinars, workshops, mini-courses) under [`content/offerings/<offeringSlug>/`](content/offerings/) as **`offering.yaml`** + MDX lessons, rendered with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote). Portal chrome uses [`PortalHeader`](components/portal/PortalHeader.tsx), [`PortalBreadcrumbs`](components/portal/PortalBreadcrumbs.tsx), and [`app/offerings/[offeringSlug]/layout.tsx`](app/offerings/[offeringSlug]/layout.tsx).

**URLs:** **`/p/[offeringSlug]`** — anonymous landing when **`visibility`** allows (**Visibility** below); syllabus titles from YAML only (no lesson MDX). **`/dashboard`** and **`/offerings/[offeringSlug]`** / **`/offerings/.../[lessonSlug]`** — [Clerk](https://clerk.com/) + [`config/students.yaml`](config/students.yaml). Home links enrolled users to **`/dashboard`**. **`format`** is dashboard/copy metadata only.

Legacy **`/courses/investing-basics/:lesson`** → **`/offerings/investing-basics-2026-05/:lesson`** ([`next.config.ts`](next.config.ts)).

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

## Visibility (`offering.yaml`)

[`middleware.ts`](middleware.ts) runs Clerk **`auth.protect()`** on **`/offerings/*`**, **`/dashboard/*`**, and **`/courses/*`**; **`/p/*`** is public.

**`visibility`** controls **`/p/[offeringSlug]`** only; **`/offerings/...`** stays allowlist-gated.

- **`visibility`** is optional — **omitted means `private`**.
- **`private`**: **`/p/[slug]`** → **404** (no slug leak). **`/offerings/...`** unchanged (Clerk + **`students.yaml`**).
- **`public`**: **`/p/[slug]`** renders the landing page (title, format, description, dates, syllabus titles from YAML). Lesson MDX and [`offering-assets`](app/api/offering-assets/[offeringSlug]/[...path]/route.ts) stay gated.
- **`unlisted`**: same landing as **`public`**, with **`robots: noindex, nofollow`** on **`/p/[slug]`**.

**`published`**: optional field, **no runtime effect** today (does not gate **`/p`**).

## Production notes

- **404:** [`app/not-found.tsx`](app/not-found.tsx) for missing routes and `notFound()` from lesson loaders.
- **403:** [`app/forbidden.tsx`](app/forbidden.tsx) when a signed-in user is not allowed on an offering (`forbidden()` from [`app/offerings/[offeringSlug]/layout.tsx`](app/offerings/[offeringSlug]/layout.tsx)).
- **Headers:** [`next.config.ts`](next.config.ts) applies baseline headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, etc.).
- **Logging:** [`lib/logger.ts`](lib/logger.ts) avoids dumping PII; the **`offering-assets`** API logs coarse codes in production only.

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

`.env.local` is gitignored; use [`.env.example`](.env.example) as a template.

## Dashboard

[`app/dashboard/page.tsx`](app/dashboard/page.tsx) is the signed-in student portal: [`PortalHeader`](components/portal/PortalHeader.tsx) (**Course Platform**, email, **Dashboard**, **Sign out**), grouped sections (**Courses**, **Webinars**, **Workshops**—only non-empty groups; **`mini-course`** appears under Courses), and cards with format badge, title, description, dates, lesson count, **Available**, and **Open** (links to **`/offerings/[offeringSlug]`** overview). Access is still enforced only on the server via **`students.yaml`**. ([`DashboardHeader`](components/dashboard/DashboardHeader.tsx) is retained temporarily during UI consolidation.)

## Students allowlist (`config/students.yaml`)

- Each student row has **`email`** and **`offerings:`** — an array of **folder slugs** under **`content/offerings/`** (same slug rules as URLs).
- **Backward compatibility:** a legacy **`courses:`** array is accepted and treated as **`offerings`** (normalized into `offerings` after parsing).
- Emails are compared case-insensitively after trim.
- Authorization runs **on the server** in [`lib/authz.ts`](lib/authz.ts) (`canAccessOffering`) via [`lib/students.ts`](lib/students.ts).
- The signed-in user’s **primary Clerk email** is used; if none, the first **verified** email is used (`getCurrentUserEmail`).
- Edit the YAML and refresh; no database sync.

## Offering assets and media

### Lesson images (filesystem)

- Put files under **`content/offerings/<offeringSlug>/assets/`**.
- From a lesson MDX file inside `module-*`, reference them with a **relative** path:

  `![Alt text](../assets/your-file.png)`

  That path is rewritten at render time to an authenticated URL served by [`app/api/offering-assets/[offeringSlug]/[...path]/route.ts`](app/api/offering-assets/[offeringSlug]/[...path]/route.ts).

- Or use the MDX component:

  `<CourseImage src="your-file.png" alt="Description" />`

Only users who pass the same **Clerk + students.yaml** checks as the lesson pages can load these URLs.

### Video embeds

**Choosing a provider:** [**Vimeo**](https://vimeo.com/) is convenient for an MVP—quick uploads and a familiar dashboard—while iframe playback stays simple public embeds (not DRM). [**Cloudflare Stream**](https://www.cloudflare.com/developer-platform/products/cloudflare-stream/) is the preferred long-term direction here for signed URLs, token-gated playback, and platform alignment; this repo still uses plain iframe embeds with `playbackId` until you wire signing server-side.

**Registry:** Put hosted-video references in **`content/offerings/<offeringSlug>/videos.yaml`**. Each key under `videos` is an **asset id** (slug rules: lowercase letters, digits, hyphens). Example:

```yaml
videos:
  lesson-1-recording:
    provider: vimeo
    videoId: "123456789"
    title: "Compounding recording"
  lesson-2-recording:
    provider: cloudflare
    playbackId: "your-stream-playback-id"
    title: "Risk and return recording"
```

**Embed in MDX** ([`VideoPlayer`](components/mdx/VideoPlayer.tsx)):

- **Registry:** `<VideoPlayer assetId="lesson-1-recording" />`
- **Direct:** `<VideoPlayer provider="vimeo" videoId="76979871" title="…" />` or `provider="cloudflare" playbackId="…"`

#### Upload to Vimeo and wire an asset id

1. Upload or record in [Vimeo](https://vimeo.com/), then open the video.
2. Copy the **numeric video ID** from the page URL (`vimeo.com/<videoId>`) or from **Share → Embed**.
3. Add a block under `videos.<your-asset-id>` in **`videos.yaml`** with `provider: vimeo`, `videoId`, and optional `title` / `privacyHash`.
4. In lesson MDX: `<VideoPlayer assetId="your-asset-id" />`.

#### Cloudflare Stream

Optional env **`NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER`** sets the iframe host; otherwise embeds use `iframe.videodelivery.net`.

Optional **`poster`** is accepted for future use; iframe embeds ignore it today.

Sample **[`investing-basics-2026-05/videos.yaml`](content/offerings/investing-basics-2026-05/videos.yaml)** defines **`risk-return-overview`** and **`diversification-explainer`**; lesson 1 still uses **direct** Vimeo props.

## Content layout

- **`content/offerings/<offeringSlug>/offering.yaml`** — title, **`format`**, **`modules`**, optional **`description`**, **`startDate`**, **`endDate`**, optional **`visibility`** (`private` \| `public` \| `unlisted`; **Visibility**), optional **`published`** (metadata only today), optional **`coverImage`** (path string under the offering folder; validated, not rendered yet).
- **`content/offerings/<offeringSlug>/videos.yaml`** — optional video registry for `<VideoPlayer assetId="…" />`.
- **`content/offerings/<offeringSlug>/<moduleSlug>/<lessonSlug>.mdx`** — lesson MDX (must match YAML).

### Copy an offering for a new run

1. Duplicate a folder under **`content/offerings/`** with a **new slug** (e.g. `my-course-2026-06`).
2. Edit **`offering.yaml`** (title, dates, **`format`**, modules/lessons as needed).
3. Adjust lesson MDX under **`module-*`**.
4. Add the new slug to **`students.yaml`** **`offerings`** for each enrolled email.

### MDX components

Wired in [`app/offerings/[offeringSlug]/[lessonSlug]/page.tsx`](app/offerings/[offeringSlug]/[lessonSlug]/page.tsx):

- `<CompoundInterestCalculator />`
- Markdown images: `![alt](../assets/file.png)`
- `<CourseImage src="file.png" alt="..." />`
- `<VideoPlayer … />`
- `<DownloadFile assetId="..." />`
- `<Quiz question="…" choices='["…","…"]' answer="0" explanation="…" />` — client-side multiple choice only. **`choices`** must be a **JSON array string** (single-quoted attribute is easiest): `next-mdx-remote` removes JSX attributes written as `{expression}`, so `choices={[…]}` never reaches the component. **`answer`** is a **0-based** index string or number; nothing is saved server-side.
- Callouts: `:::tip … :::` or `:::warning[Custom title] … :::` (see **Callouts (directives)** below).
- Collapsible blocks: `:::details[Optional title] … :::` (see **Details (collapsible)** below).

Lessons are compiled with **remark-directive**, **remark-math**, and **rehype-katex** ([`app/offerings/[offeringSlug]/[lessonSlug]/page.tsx`](app/offerings/[offeringSlug]/[lessonSlug]/page.tsx)); KaTeX CSS is loaded from the root layout.

### Callouts (directives)

Use **container directives** with supported names: **`note`**, **`tip`**, **`warning`**, **`danger`**, **`important`**, **`exercise`**.

Plain callout (heading defaults to the type, e.g. “Tip”):

```markdown
:::tip
Start early — time matters more than timing.
:::
```

Optional **title** in brackets (shown instead of the default label):

```markdown
:::warning[Tax warning]
Wash sale rules may apply across accounts.
:::
```

Close each block with a line containing only `:::`. Implementation: [`lib/mdx-callouts.ts`](lib/mdx-callouts.ts) and [`components/mdx/Callout.tsx`](components/mdx/Callout.tsx).

### Details (collapsible)

Optional sections using native `<details>` (same directive pipeline as callouts):

```markdown
:::details[Advanced explanation]
Long optional explanation here. Markdown and math work inside.
:::
```

Without brackets, the summary label defaults to **Details**:

```markdown
:::details
Extra body content.
:::
```

Component: [`components/mdx/Details.tsx`](components/mdx/Details.tsx). Parsed alongside callouts in [`lib/mdx-callouts.ts`](lib/mdx-callouts.ts).

### Using LaTeX

- **Inline math:** wrap TeX in single dollar signs, e.g. `$E = mc^2$`.
- **Block math:** use `$$` on its own lines:

  ```markdown
  $$
  \sum_{i=1}^n i = \frac{n(n+1)}{2}
  $$
  ```

- A literal dollar sign in prose may need escaping (e.g. `\$100`) so it is not parsed as math.

### Adding a new lesson

1. Edit **`offering.yaml`** — add `{ slug, title }` under the right module **`lessons`**.
2. Add **`content/offerings/<offeringSlug>/<moduleSlug>/<lessonSlug>.mdx`**.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Signed out:** sign-in prompt. **Signed in:** welcome, link to **[`/dashboard`](/dashboard)** and a sample lesson.

In **`npm run dev`** only, offering pages show a footer note: **Access controlled by config/students.yaml**.

### How to test access

**a) Authorized student**

1. Email appears under **`offerings`** in [`config/students.yaml`](config/students.yaml) (e.g. `investing-basics-2026-05`).
2. Sign in.
3. Open [`/dashboard`](/dashboard) or the offering overview [`/offerings/investing-basics-2026-05`](http://localhost:3000/offerings/investing-basics-2026-05) (and a lesson such as [`lesson-1`](http://localhost:3000/offerings/investing-basics-2026-05/lesson-1) from there).

**b) Unauthorized student**

1. Sign in with an email **not** in `students.yaml`.
2. Visit `/offerings/investing-basics-2026-05/lesson-1`.
3. Expect **You do not have access to this offering** (HTTP **403**) via [`app/forbidden.tsx`](app/forbidden.tsx). Middleware requires sign-in for **`/offerings/*`** and **`/dashboard`**.

**Legacy URL:** `/courses/investing-basics/lesson-1` redirects to the new offering path (see **`next.config.ts`**).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Serve production   |
| `npm run lint` | ESLint (`eslint .`) |
| `npm test`     | Node test runner (`tsx --test`) |

## Out of scope

No database, Stripe/Telegram integrations, or payments. Auth is Clerk + local YAML allowlist only.
