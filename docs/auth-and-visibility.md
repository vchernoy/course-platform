# Auth and visibility

Clerk authentication, `students.yaml` allowlists, route-level protection, and `visibility` on offerings and sites. Related: [Architecture](./architecture.md), [Content layout](./content-layout.md), [MDX authoring](./mdx-authoring.md).

## Clerk

1. Create an application in the [Clerk Dashboard](https://dashboard.clerk.com/).
2. Under **Configure → API keys**, copy the publishable and secret keys.
3. Copy [`.env.example`](../.env.example) to `.env.local` and set:

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Browser-safe |
   | `CLERK_SECRET_KEY` | Yes | Server-only |

4. **Configure → Paths:** align redirect URLs with your deployment (local dev typically `http://localhost:3000`). Sign-in/sign-up routes in this repo: `/sign-in`, `/sign-up`.

5. **Authentication strategies:** OAuth and/or passwordless email fit this codebase; if passwords are disabled in Clerk, the UI stays aligned.

Restart `npm run dev` after changing `.env.local`.

### Optional environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Defaults to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Defaults to `/sign-up` |
| `NEXT_PUBLIC_SHOW_SIGN_UP_LINK` | Set `false` to hide home **Sign up** link |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER` | Optional Stream iframe host (see [MDX authoring](./mdx-authoring.md)) |

## Students allowlist (`config/students.yaml`)

- Each row: **`email`** and **`offerings`** — array of folder slugs under `content/offerings/`.
- Legacy **`courses`** array is accepted and normalized to **`offerings`**.
- Emails are trimmed and compared case-insensitively.
- [`getCurrentUserEmail`](../lib/authz.ts) prefers Clerk primary email, else first verified email.
- [`canAccessOffering`](../lib/authz.ts) gates `/offerings/*` layouts and asset API access.

No database sync: edit YAML and reload.

## Route behavior

### `/s/[siteSlug]`, `/s/[siteSlug]/[pageSlug]`

- Not behind Clerk middleware — anonymous requests reach the route handler ([`middleware.ts`](../middleware.ts) does not match `/s/*`).
- Renders MDX from **`content/sites/`** only when [`isPublicSite`](../lib/sites.ts) is true (`visibility` **`public`** or **`unlisted`** in **`site.yaml`**). **`private`** (or omitted visibility, treated as private) → **404**.
- **`unlisted`:** page metadata sets **`robots: noindex, nofollow`** (same pattern as `/p`).
- Phase&nbsp;1 sites use a **minimal** MDX pipeline ([`lib/mdx-site-compile.tsx`](../lib/mdx-site-compile.tsx)); there is **no** site asset API yet — prefer absolute image URLs if needed.

### `/p/[offeringSlug]`

- Not behind Clerk middleware ([`middleware.ts`](../middleware.ts) excludes `/p/*` from `auth.protect()`).
- Renders only if [`isPublicOfferingLanding`](../lib/offerings.ts) is true (`visibility` is `public` or `unlisted`).
- Response body uses **`offering.yaml` metadata only** — module and lesson **titles**, not `.mdx` bodies.

### `/dashboard`, `/offerings/*`, legacy `/courses/*`

- Middleware requires signed-in user.
- Offering layout additionally calls `canAccessOffering`; mismatch yields **403** ([`app/forbidden.tsx`](../app/forbidden.tsx)).

### Dashboard

[`app/dashboard/page.tsx`](../app/dashboard/page.tsx) lists offerings the email may access, grouped by format. Cards link to `/offerings/[slug]` overview.

## Visibility semantics (`offering.yaml`)

**`visibility`** controls **`/p/[offeringSlug]` only.** `/offerings/...` remains allowlist-gated regardless.

| Value | Omitted | Effect |
|-------|---------|--------|
| *(missing)* | treated as `private` | `/p/slug` → **404** |
| `private` | — | `/p/slug` → **404** |
| `public` | — | `/p/slug` renders landing; indexable unless overridden elsewhere |
| `unlisted` | — | Same landing as `public`; page metadata sets **`robots: noindex, nofollow`** |

Private slugs are not confirmed via `/p` (404 avoids enumeration signal).

**`published`:** optional boolean, validated; **no runtime effect** today (does not gate `/p`).

## Visibility semantics (`site.yaml`)

**`visibility`** gates **`/s/*`** public routes ([`lib/sites.ts`](../lib/sites.ts)): omitted → **`private`** → **404** on `/s/...`; **`public`** / **`unlisted`** render MDX; **`unlisted`** adds **`robots: noindex, nofollow`** (see Route behavior above).

## Middleware

[`middleware.ts`](../middleware.ts) uses `createRouteMatcher` for `/offerings(.*)`, `/dashboard(.*)`, `/courses(.*)` and runs `auth.protect()` on those paths only.

## Security boundaries

| Asset | Anonymous | Signed in, not allowlisted | Allowlisted |
|-------|-----------|----------------------------|-------------|
| `/p/*` HTML | If `public`/`unlisted` | Same | Same |
| `/offerings/*` lesson MDX | N/A (middleware) | 403 on layout | Served |
| `/api/offering-assets/...` | 401 | 403 | Stream after path validation |

- **404:** [`app/not-found.tsx`](../app/not-found.tsx); loaders call `notFound()` for bad slugs or missing files.
- **403:** offering layout when email lacks slug.
- **Headers:** [`next.config.ts`](../next.config.ts) sets baseline security headers.
- **Logging:** [`lib/logger.ts`](../lib/logger.ts); offering-assets avoids PII, coarse codes in production.

## Testing access

**Authorized:** Email listed under `offerings` for a slug → sign in → `/dashboard` or `/offerings/<slug>/...`.

**Unauthorized:** Sign in with email not in YAML → open `/offerings/<slug>/lesson` → expect 403.

**Public landing:** Sign out → `/p/<slug>` for a `public` or `unlisted` offering should render without Clerk.

Legacy redirect: `/courses/investing-basics/:lesson` → `/offerings/investing-basics-2026-05/:lesson` ([`next.config.ts`](../next.config.ts)).

## See also

- [Architecture](./architecture.md)
- [Content layout](./content-layout.md)
- [MDX authoring](./mdx-authoring.md)
