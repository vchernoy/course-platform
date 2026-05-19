# Admin authoring (preview + Git-backed publishing)

This document describes the **intended** admin authoring architecture. Today the app ships scaffolding: [`/admin`](../app/admin/layout.tsx), [`config/admins.yaml`](../config/admins.yaml), [`lib/content-repository/`](../lib/content-repository/), YAML-driven **offering-scoped** admin roles, shared lesson compilation in [`lib/mdx-lesson-compile.tsx`](../lib/mdx-lesson-compile.tsx), and a **non-persistent** lesson preview at **`/admin/offerings/[slug]/lessons/[lessonSlug]/preview`**. No draft persistence, Git writes, browser editor (Monaco/TipTap), or database yet.

Related: [Architecture](./architecture.md), [Auth and visibility](./auth-and-visibility.md), [Content layout](./content-layout.md).

## Admin access model

Admins are configured in **[`config/admins.yaml`](../config/admins.yaml)** (Git-tracked). Each row has:

- **`email`** — matched case-insensitively (same normalization as [`students.yaml`](./auth-and-visibility.md)).
- **`role`** — `owner` \| `editor` \| `viewer` (validated at load time; reserved for future permission differences).
- **`offerings`** — non-empty array; each entry is **`"`*`"`** (all offerings on the platform) **or** a safe offering slug under `content/offerings/`. Mixing **`*`** with specific slugs is **not** allowed.

Helpers live in [`lib/admins.ts`](../lib/admins.ts) (pure + config) and [`lib/admin-auth.ts`](../lib/admin-auth.ts) (loads YAML):

- `emailIsAdmin` / `canAccessAdmin` — any configured admin row.
- `getAdminAccess` — role + scope (`allOfferings` vs explicit slug list).
- `canAdminAccessOffering(email, offeringSlug)` — gate `/admin/offerings/[slug]`.
- `listAdminAllowedOfferingSlugs(email, allOfferingSlugs)` — drives `/admin/offerings`.

An admin with **`offerings: ["*"]`** sees **every** offering returned by [`listOfferingSlugs`](../lib/offerings.ts) (typical for **owner**). Scoped rows only see listed slugs.

**Students vs admins:** [`students.yaml`](../config/students.yaml) controls learner access to **`/offerings/*`**. Admin UI uses **`admins.yaml`** only. The same person may appear in both files with different scopes.

**Multi-tenant future:** Today there is a single YAML file and one content tree. Later, **tenant id** can select which repo / DB / bucket backs a `ContentRepository` without changing lesson URLs.

## Draft vs published vs preview (today)

| Kind | Storage | Notes |
|------|---------|--------|
| **Published lessons** | Git / filesystem (`content/offerings/…/*.mdx`) | Source of truth for learners after deploy. |
| **Draft / unsaved edits** | None persisted yet | Preview uses an in-memory MDX string only (textarea state + server round-trip). |
| **Future drafts** | Planned: database or workspace store | Holds WIP before publish. |
| **Future publish** | Planned: Git commit (e.g. GitHub API) | Promotion from draft to repo; deployment unchanged. |

The admin preview route loads **published** source by default (via [`GitContentRepository`](../lib/content-repository/git-content-repository.ts)), lets you edit MDX in the browser **without saving**, and re-renders on **Preview** — nothing writes to `*.mdx`, `offering.yaml`, `videos.yaml`, `resources.yaml`, or Git.

## Preview implementation: skeleton vs final architecture

**Current (temporary skeleton):** submitted MDX is compiled with [`compileLessonMdxContent`](../lib/mdx-lesson-compile.tsx) (same pipeline as learners), then turned into **static HTML** via **`react-dom/server`**’s **`renderToString`** (loaded **dynamically** so Turbopack does not merge `react-dom/server` into the shared lesson compile graph) inside [`lib/mdx-lesson-preview-serialize.tsx`](../lib/mdx-lesson-preview-serialize.tsx). The admin UI injects that HTML with **`dangerouslySetInnerHTML`**. The server action lives in [`lib/admin-preview-lesson-action.ts`](../lib/admin-preview-lesson-action.ts).

**Important limitation:** this is **not** the final preview architecture. **`renderToString` + static HTML injection does not run the normal Next.js / React Client Component hydration path** for interactive lesson blocks (`Quiz`, calculators, etc.). For the HTML skeleton, **`Quiz`** and **`CompoundInterestCalculator`** are replaced by **server-rendered placeholder callouts** so preview does not crash; other client-heavy blocks may still need the same treatment later. Those placeholders **must not** be assumed to match learner behavior until preview is upgraded.

**Final direction:** preview should render MDX through the **normal App Router / RSC (and client boundary) pipeline**, for example:

- a **dedicated preview route** (or parallel route) that server-compiles MDX and streams **live React output** the same way [`app/offerings/…/[lessonSlug]/page.tsx`](../app/offerings/%5BofferingSlug%5D/%5BlessonSlug%5D/page.tsx) does, optionally embedded in an **`iframe`** for isolation; or  
- another pattern that preserves **client component hydration**, not serialized HTML paste.

Until then, treat admin preview as **layout/content sanity checking**, not authoritative interactive QA.

## Intended authoring workflow

```text
Admin edits MDX
↓
Unsaved draft compiled in memory (or stored in DB)
↓
Preview rendered with same MDX pipeline as lessons
↓
Publish creates Git commit (via GitHub API or trusted worker)
↓
GitHub push triggers deployment
```

**Preview before save/publish:** Use the same compile helper as lessons ([`compileLessonMdxContent`](../lib/mdx-lesson-compile.tsx)); today’s admin UI additionally serializes to HTML for display only (see limitations above).

## Why Git-native publishing

- **Published** content stays **reviewable and reproducible** (PRs, blame, rollback).
- **Filesystem writes alone** are insufficient in production: multi-instance hosts race on disk, there is no audit trail, and rollback is ad hoc.
- **Operational shape:** an Admin “Publish” action should produce a **commit** (eventually via **GitHub API** or a locked-down CI job), then normal **deploy from Git** refreshes what learners see.

This matches the platform principle that **Git/files remain source of truth for published content** ([architecture](./architecture.md)).

## ContentRepository abstraction

[`lib/content-repository/types.ts`](../lib/content-repository/types.ts) defines a **`ContentRepository`** for reading (and future writing) offerings and lesson sources. [`GitContentRepository`](../lib/content-repository/git-content-repository.ts) implements today’s behavior using [`loadOffering`](../lib/offerings.ts) / [`loadLessonSource`](../lib/offerings.ts).

Lesson routes **do not** use this layer yet; they keep calling `lib/offerings` directly so behavior is unchanged.

### Future repository backends (planned only)

| Implementation | Role |
|----------------|------|
| **GitContentRepository** | Current disk + YAML + MDX under `content/offerings/` (read; later publish via Git). |
| **DatabaseContentRepository** | Draft bodies, metadata, review state; **published** snapshot still promoted to Git or exported blob. |
| **CustomerGitHubRepository** | Per-tenant repo / branch; publish opens PR or merges via GitHub App (not implemented). |

Object storage would hold **large binaries** (replacing or mirroring `assets/`) while **lesson MDX** and **registries** remain addressable and searchable.

## Explicit non-goals (current phase)

- Browser editor (Monaco, TipTap, etc.)
- GitHub API writes, DB schema, object storage
- Draft persistence, collaborative editing, AI authoring flows

These stay out of scope until the read-only scaffolding and publishing design are validated.

## See also

- [Architecture](./architecture.md) — routes, MDX, Git-native summary
- [Auth and visibility](./auth-and-visibility.md) — Clerk, middleware, `students.yaml`
