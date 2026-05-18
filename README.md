# Course platform

Git-backed LMS prototype: each **offering** is `content/offerings/<slug>/` with `offering.yaml` and lesson MDX. Student UI uses Next.js App Router, Clerk, and a YAML email allowlist — no database.

## Architecture (summary)

- **Content:** YAML defines modules and lesson slugs; `.mdx` files hold lesson bodies ([content layout](docs/content-layout.md)).
- **Rendering:** Lessons compiled with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote); KaTeX for math ([MDX authoring](docs/mdx-authoring.md)).
- **Routes:** Public **`/p/[slug]`** when `visibility` allows; private **`/dashboard`** and **`/offerings/*`** require Clerk + [`config/students.yaml`](config/students.yaml) ([auth and visibility](docs/auth-and-visibility.md)).
- **Assets:** `/api/offering-assets/...` streams files under `assets/` after the same auth checks as lessons ([architecture](docs/architecture.md)).

Portal chrome: [`PortalHeader`](components/portal/PortalHeader.tsx), [`PortalBreadcrumbs`](components/portal/PortalBreadcrumbs.tsx), [`app/offerings/[offeringSlug]/layout.tsx`](app/offerings/%5BofferingSlug%5D/layout.tsx).

## Key URLs

| Path | Access |
|------|--------|
| `/` | Home |
| `/p/[offeringSlug]` | Anonymous if offering is `public` / `unlisted` |
| `/dashboard` | Signed in |
| `/offerings/[offeringSlug]`, `/offerings/.../[lessonSlug]` | Signed in + allowlist |
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
| [docs/architecture.md](docs/architecture.md) | Offerings, routes, MDX pipeline, assets, visibility model, Git-native design |
| [docs/auth-and-visibility.md](docs/auth-and-visibility.md) | Clerk, `students.yaml`, middleware, `/p` vs `/offerings`, security boundaries |
| [docs/content-layout.md](docs/content-layout.md) | `offering.yaml`, `videos.yaml`, `assets/`, slugs, copying offerings |
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

- Auth: Clerk + local YAML allowlist only.
- No database, payments (Stripe), Telegram, or search.
- `published` in `offering.yaml` is metadata-only at runtime.
