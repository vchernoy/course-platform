# Admin authoring (preview, local drafts, Git-backed publishing)

This document describes the **admin authoring architecture**. The app ships: [`/admin`](../app/admin/layout.tsx), [`config/admins.yaml`](../config/admins.yaml), [`lib/content-repository/`](../lib/content-repository/), YAML-driven **offering-scoped** admin roles plus optional **site-scoped** **`sites`**, shared lesson compilation in [`lib/mdx-lesson-compile.tsx`](../lib/mdx-lesson-compile.tsx), site compilation in [`lib/mdx-site-compile.tsx`](../lib/mdx-site-compile.tsx), read-only **sites** lists under **`/admin/sites`**, **lesson MDX preview**, **site MDX preview** (via server actions used from edit UI), and **Phase 3A local draft files** under **`.data/drafts/`** (per-admin, filesystem only). No database, GitHub publish API, Monaco/TipTap, or collaborative editing yet.

Related: [Architecture](./architecture.md), [Auth and visibility](./auth-and-visibility.md), [Content layout](./content-layout.md).

## Admin access model

Admins are configured in **[`config/admins.yaml`](../config/admins.yaml)** (Git-tracked). Each row has:

- **`email`** — matched case-insensitively (same normalization as [`students.yaml`](./auth-and-visibility.md)).
- **`role`** — `owner` \| `editor` \| `viewer` (validated at load time; reserved for future permission differences).
- **`offerings`** — non-empty array; each entry is **`"`*`"`** (all offerings on the platform) **or** a safe offering slug under `content/offerings/`. Mixing **`*`** with specific slugs is **not** allowed.
- **`sites`** (optional) — when **omitted**, this admin has **no** site admin access. When present: non-empty array; each entry is **`"`*`"`** (all sites under `content/sites/`) **or** a safe site slug. Mixing **`*`** with specific site slugs is **not** allowed.

**Application code** should use [`lib/admin-auth.ts`](../lib/admin-auth.ts) (loads YAML once per call site):

- `emailIsAdmin` / `canAccessAdmin` — any configured admin row.
- `getAdminAccess` — role + scopes (`allOfferings` / `allSites` vs explicit slug lists).
- `canAdminAccessOffering(email, offeringSlug)` — gate **`/admin/offerings/[slug]`** and lesson admin routes.
- `listAdminAllowedOfferingSlugs(email, allOfferingSlugs)` — drives **`/admin/offerings`**.
- `canAdminAccessSite(email, siteSlug)` — gate **`/admin/sites/[siteSlug]`** and site page edit routes.
- `listAdminAllowedSiteSlugs(email, allSiteSlugs)` — drives **`/admin/sites`**.

[`lib/admins.ts`](../lib/admins.ts) holds pure parsers plus **`…FromConfig`** helpers — useful for tests and offline validation; route handlers and server actions should prefer **`admin-auth`** wrappers above.

An admin with **`offerings: ["*"]`** sees **every** offering returned by [`listOfferingSlugs`](../lib/offerings.ts) (typical for **owner**). Scoped rows only see listed slugs.

**Students vs admins:** [`students.yaml`](../config/students.yaml) controls learner access to **`/offerings/*`**. Admin UI uses **`admins.yaml`** only. The same person may appear in both files with different scopes.

**Multi-tenant future:** Today there is a single YAML file and one content tree. Later, **tenant id** can select which repo / DB / bucket backs a `ContentRepository` without changing lesson URLs.

## Draft vs published vs preview (today)

| Kind | Storage | Notes |
|------|---------|--------|
| **Published lessons** | Git / filesystem (`content/offerings/…/*.mdx`) | Source of truth for learners after deploy. Never modified by admin edit UI. |
| **Published site pages** | Git / filesystem (`content/sites/…/pages/*.mdx`) | Same; edit UI does not write here. |
| **Local per-admin drafts** | **`.data/drafts/`** on the host filesystem | Phase 3A: YAML-frontmatter `.mdx` files per admin email basename. **Development / self-hosted only** — **not** durable on typical **Vercel/serverless** ephemeral disks; treat as a convenience layer until a real backend exists. |
| **Preview-only textarea** | In-memory | **`…/preview`** lesson route starts from **published** Git source each load; does not read `.data` drafts. |

### Draft layout (Phase 3A)

Drafts are addressed by [`DraftRepository`](../lib/drafts/types.ts); the default implementation is [`LocalFileDraftRepository`](../lib/drafts/local-file-draft-repository.ts):

- Offerings: `.data/drafts/offerings/<offeringSlug>/<lessonSlug>/<sanitized-email>.mdx`
- Sites: `.data/drafts/sites/<siteSlug>/<pageSlug>/<sanitized-email>.mdx` (`pageSlug` **`index`** for the home page)

**Admin routes:**

- **Edit draft (lesson):** `/admin/offerings/[offeringSlug]/lessons/[lessonSlug]/edit` — loads published source unless this admin has a draft; **Save draft** / **Discard draft** touch **only** `.data/drafts`.
- **Edit draft (site page):** `/admin/sites/[siteSlug]/pages/[pageSlug]/edit` — same semantics.

**Preview buttons** on edit pages compile the **current textarea** via the same pipelines as learners (then HTML serialization for display — see below).

### Future draft backends (planned only)

| Implementation | Role |
|----------------|------|
| **`LocalFileDraftRepository`** | Current Phase 3A behavior under `.data/drafts`. |
| **`DatabaseDraftRepository`** | Durable drafts, metadata, review — optional promotion to Git. |
| **`GitHubDraftRepository`** | Branches or PRs — not implemented. |

Published content remains **Git-tracked** / reproducible; durable drafts would sit **beside** that until publish.

## Preview implementation: skeleton vs final architecture

**Lessons — current (temporary skeleton):** submitted MDX is compiled with the lesson pipeline, then turned into **static HTML** via **`react-dom/server`**’s **`renderToString`** (loaded **dynamically**) inside [`lib/mdx-lesson-preview-serialize.tsx`](../lib/mdx-lesson-preview-serialize.tsx). The server action is [`lib/admin-preview-lesson-action.ts`](../lib/admin-preview-lesson-action.ts). Auth uses **`canAdminAccessOffering`** from [`lib/admin-auth.ts`](../lib/admin-auth.ts).

**Sites — same pattern:** [`lib/mdx-site-preview-serialize.tsx`](../lib/mdx-site-preview-serialize.tsx) + [`lib/admin-preview-site-action.ts`](../lib/admin-preview-site-action.ts), gated by **`canAdminAccessSite`**.

**Important limitation:** **`renderToString` + static HTML injection does not run the normal Next.js / React Client Component hydration path** for interactive lesson blocks (`Quiz`, calculators, etc.). For lessons, preview replaces some blocks with placeholders so preview does not crash. Treat admin preview as **layout/content sanity checking**, not authoritative interactive QA.

**Final direction:** preview should render through the **normal App Router / RSC pipeline** (e.g. dedicated route or `iframe`) so client components hydrate — see architecture discussion in earlier revisions of this doc.

## Intended authoring workflow

```text
Admin edits MDX (published or local draft overlay)
↓
Preview compiles in memory (optional)
↓
Save draft writes .data/drafts only (Phase 3A) — or future DB/GitHub draft store
↓
Publish (future) creates Git commit / merge
↓
Deploy from Git refreshes what learners see
```

## Why Git-native publishing

- **Published** content stays **reviewable and reproducible** (PRs, blame, rollback).
- **Filesystem writes on multi-instance hosts** are insufficient for published content: races, no audit trail.
- **Operational shape:** a future **Publish** action should produce a **commit** (GitHub API or CI), then deploy from Git.

This matches the principle that **Git/files remain source of truth for published content** ([architecture](./architecture.md)).

## ContentRepository abstraction

[`lib/content-repository/types.ts`](../lib/content-repository/types.ts) defines **`ContentRepository`** for reading offerings and lesson sources. [`GitContentRepository`](../lib/content-repository/git-content-repository.ts) implements today’s behavior using [`loadOffering`](../lib/offerings.ts) / [`loadLessonSource`](../lib/offerings.ts).

**Drafts** use a separate **`DraftRepository`** ([`lib/drafts/`](../lib/drafts/)), not `ContentRepository`, so publish and draft storage can evolve independently.

Lesson routes **do not** use `ContentRepository` yet; they call `lib/offerings` directly.

### Future repository backends (published content — planned only)

| Implementation | Role |
|----------------|------|
| **GitContentRepository** | Current disk + YAML + MDX under `content/offerings/` (read; later publish via Git). |
| **DatabaseContentRepository** | Metadata / drafts / review; **published** snapshot promoted to Git. |
| **CustomerGitHubRepository** | Per-tenant repo / branch — not implemented. |

Object storage would hold **large binaries** while **MDX** stays searchable.

## Explicit non-goals (current phase)

- Rich browser editor (Monaco, TipTap, etc.)
- GitHub API writes for publish, production DB schema for drafts
- Collaborative editing, autosave, AI authoring flows

These stay out of scope until local authoring UX and publish design are validated.

## See also

- [Architecture](./architecture.md) — routes, MDX, Git-native summary, Phase 3A drafts note
- [Auth and visibility](./auth-and-visibility.md) — Clerk, middleware, `students.yaml`
- [`lib/drafts/draft-frontmatter.ts`](../lib/drafts/draft-frontmatter.ts) — strict YAML frontmatter parse/format used by draft files
