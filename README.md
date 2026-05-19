# Course platform

Git-backed LMS prototype: each **offering** is `content/offerings/<slug>/` with `offering.yaml` and lesson MDX. Student UI uses Next.js App Router, Clerk, and a YAML email allowlist — no database.

## Architecture (summary)

- **Content:** YAML defines modules and lesson slugs; `.mdx` files hold lesson bodies ([content layout](docs/content-layout.md)).
- **Rendering:** Lessons compiled with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote); KaTeX for math ([MDX authoring](docs/mdx-authoring.md)).
- **Routes:** Public **`/p/[slug]`** when offering `visibility` allows; public **`/s/[siteSlug]`** for simple sites when `site.yaml` allows; private **`/dashboard`** and **`/offerings/*`** require Clerk + [`config/students.yaml`](config/students.yaml) ([auth and visibility](docs/auth-and-visibility.md)); **`/admin/*`** requires Clerk + [`config/admins.yaml`](config/admins.yaml) ([admin authoring](docs/admin-authoring.md)).
- **Assets:** `/api/offering-assets/...` streams files under `assets/` after the same auth checks as lessons ([architecture](docs/architecture.md)).

Portal chrome: [`PortalHeader`](components/portal/PortalHeader.tsx), [`PortalBreadcrumbs`](components/portal/PortalBreadcrumbs.tsx), [`app/offerings/[offeringSlug]/layout.tsx`](app/offerings/%5BofferingSlug%5D/layout.tsx).

## Key URLs

| Path | Access |
|------|--------|
| `/` | Home |
| `/p/[offeringSlug]` | Anonymous if offering is `public` / `unlisted` |
| `/dashboard` | Signed in |
| `/admin`, `/admin/offerings`, `/admin/offerings/[slug]`, `/admin/sites`, `/admin/sites/[siteSlug]` | Signed in + [`admins.yaml`](config/admins.yaml) (offering + optional site scopes) |
| `/s/[siteSlug]`, `/s/.../[pageSlug]` | Anonymous when site `visibility` is `public` / `unlisted` ([content layout](docs/content-layout.md)) |
| `/offerings/[offeringSlug]`, `/offerings/.../[lessonSlug]` | Signed in + [`students.yaml`](config/students.yaml) |
| `/sign-in`, `/sign-up` | Clerk |

Legacy: `/courses/investing-basics/:lesson` → `/offerings/investing-basics-2026-05/:lesson` ([`next.config.ts`](next.config.ts)).

## Quick start

**Prerequisites:** Node.js 20.19+ or 22.13+; a [Clerk](https://clerk.com/) application.

```bash
npm install
cp .env.example .env.local   # add Clerk keys — see docs/auth-and-visibility.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In dev, offering footers may note allowlist-driven access.

## Documentation

| Doc | Topics |
|-----|--------|
| [docs/architecture.md](docs/architecture.md) | Offerings, routes, MDX pipeline, assets, visibility, search, admin scaffolding |
| [docs/admin-authoring.md](docs/admin-authoring.md) | Admin roles, ContentRepository, preview/publish roadmap |
| [docs/auth-and-visibility.md](docs/auth-and-visibility.md) | Clerk, `students.yaml`, middleware, `/p` vs `/offerings`, security boundaries |
| [docs/content-layout.md](docs/content-layout.md) | `offering.yaml`, `site.yaml`, `videos.yaml`, `assets/`, slugs, copying offerings |
| [docs/mdx-authoring.md](docs/mdx-authoring.md) | Components, Quiz, VideoPlayer, callouts, details, LaTeX |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production |
| `npm run lint` | ESLint |
| `npm test` | `tsx --test` |

## Current status / scope

- Auth: Clerk + local YAML (`students.yaml` for learners, `admins.yaml` for read-only admin UI).
- Filesystem-backed marketing/simple **sites** at **`/s/...`** (`content/sites/`); admin listing **`/admin/sites`** (optional **`sites`** scope in `admins.yaml`).
- Offering-scoped lesson search under `/offerings/.../search`.
- No payments (Stripe), Telegram, or DB-backed drafts yet.
- `published` in `offering.yaml` is metadata-only at runtime.
