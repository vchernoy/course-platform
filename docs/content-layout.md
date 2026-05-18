# Content layout

Filesystem layout for offerings: YAML registries, assets, lessons, and slug rules. Related: [Architecture](./architecture.md), [MDX authoring](./mdx-authoring.md), [Auth and visibility](./auth-and-visibility.md).

## `offering.yaml`

Path: `content/offerings/<offeringSlug>/offering.yaml`

Validated by [`lib/offerings.ts`](../lib/offerings.ts). Required fields include **`title`**, **`format`**, **`modules`** (non-empty). Each module has **`slug`**, **`title`**, **`lessons`** (non-empty); each lesson **`slug`**, **`title`**.

Optional fields:

- **`description`**, **`startDate`**, **`endDate`** — strings
- **`visibility`** — `private` \| `public` \| `unlisted` (omitted → private for `/p` routing; see [Auth and visibility](./auth-and-visibility.md))
- **`published`** — boolean; metadata only, no runtime gate today
- **`coverImage`** — path string under the offering folder; validated, not rendered in UI yet

## `videos.yaml`

Path: `content/offerings/<offeringSlug>/videos.yaml`

Optional registry for `<VideoPlayer assetId="..." />`. Keys are asset ids (slug-like). Entries include `provider` (`vimeo` \| `cloudflare`), provider-specific ids, optional `title`.

See [MDX authoring](./mdx-authoring.md) for embed patterns and env vars.

## `assets/`

Path: `content/offerings/<offeringSlug>/assets/`

Binary files (images, PDFs, etc.) served through [`app/api/offering-assets/[offeringSlug]/[...path]/route.ts`](../app/api/offering-assets/%5BofferingSlug%5D/%5B...path%5D/route.ts). Same Clerk + allowlist checks as lessons.

## Lesson structure

- Files: `content/offerings/<offeringSlug>/<moduleSlug>/<lessonSlug>.mdx`
- **`lessonSlug`** and **`moduleSlug`** must match entries in `offering.yaml`
- Lesson compilation: [`app/offerings/[offeringSlug]/[lessonSlug]/page.tsx`](../app/offerings/%5BofferingSlug%5D/%5BlessonSlug%5D/page.tsx)

Relative images from a lesson typically use `../assets/...`; the loader rewrites those URLs for the authenticated asset route.

## Copying an offering for a new run

1. Duplicate `content/offerings/<old-slug>/` to a **new folder name** (new slug).
2. Edit `offering.yaml`: title, dates, format, modules/lessons as needed.
3. Adjust or replace lesson `.mdx` under `module-*`.
4. Grant access: add the new slug to each enrolled email’s **`offerings`** in [`config/students.yaml`](../config/students.yaml).

If the offering should have a public brochure page, set **`visibility`** accordingly ([Auth and visibility](./auth-and-visibility.md)).

## Adding a lesson

1. Append `{ slug, title }` under the correct module **`lessons`** in `offering.yaml`.
2. Create `content/offerings/<offeringSlug>/<moduleSlug>/<lessonSlug>.mdx`.

## Slug rules

Slugs for offerings, modules, and lessons must satisfy [`isSafeSlug`](../lib/slug.ts) / `assertSafeSlug`: practical constraint is lowercase URL-safe segments (letters, digits, hyphens) consistent with route params and file paths. Invalid slugs yield validation errors at load time or `notFound()` in routes.

## See also

- [Architecture](./architecture.md)
- [Auth and visibility](./auth-and-visibility.md)
- [MDX authoring](./mdx-authoring.md)
