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

`.env.local` is gitignored; use [`.env.example`](.env.example) as a template.

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
3. You should see **Access denied** and a **Sign out** button (middleware still requires sign-in for `/courses/*`).

## Content layout

- `content/courses/<courseSlug>/course.yaml` — course title and modules (validated at load time).
- `content/courses/<courseSlug>/<moduleSlug>/<lessonSlug>.mdx` — lesson MDX (must match `module.slug` and lesson `slug` from YAML).

### MDX components

These tags are wired in [`app/courses/[courseSlug]/[lessonSlug]/page.tsx`](app/courses/[courseSlug]/[lessonSlug]/page.tsx):

- `<CompoundInterestCalculator />`
- `<ProtectedVideo assetId="..." />`
- `<DownloadFile assetId="..." />`

### Adding a new lesson

1. Edit `content/courses/<courseSlug>/course.yaml` — under the right module `lessons` list, add `{ slug: lesson-x, title: "..." }`. Use a unique `slug` within the course.
2. Add the file `content/courses/<courseSlug>/<moduleSlug>/<lessonSlug>.mdx` (same `moduleSlug` as in YAML and same `lessonSlug` as in the entry).
3. Use MDX components as needed (`CompoundInterestCalculator`, `ProtectedVideo`, `DownloadFile`).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Serve production   |
| `npm run lint` | ESLint (`eslint .`) |

## Out of scope

No database, Stripe/Telegram integrations, or real video/file protection yet. Auth is Clerk + local YAML allowlist only.
