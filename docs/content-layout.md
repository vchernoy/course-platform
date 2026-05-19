# Content layout

Filesystem layout for **offerings** and **simple sites**: YAML registries, assets, lessons/pages, and slug rules. Related: [Architecture](./architecture.md), [MDX authoring](./mdx-authoring.md), [Auth and visibility](./auth-and-visibility.md).

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

## `resources.yaml`

Path: `content/offerings/<offeringSlug>/resources.yaml`

Optional registry for `<ResourceLink assetId="..." />`. Keys are asset ids (same slug-like rules as `videos.yaml`). Each entry has **`type`**: `local` \| `external`.

- **`local`** — **`label`**, **`path`**: relative path under `assets/` using `/` separators. Each path segment must satisfy **[`isSafeAssetSegment`](../lib/slug.ts)** (letters, digits, `.`, `_`, `-`; not [`isSafeSlug`](../lib/slug.ts)). Typical filenames such as `worksheet-1.pdf`, `chart-v1.png`, and `roth_worksheet.pdf` are valid segments.
- **`external`** — **`label`**, **`url`** (`http:` or `https:` only), optional **`warning`** shown below the link.

Validated by [`lib/offering-resources.ts`](../lib/offering-resources.ts). Missing file on disk for a local entry surfaces an amber helper in the lesson (same spirit as unknown `assetId`).

## `assets/`

Path: `content/offerings/<offeringSlug>/assets/`

Binary files (images, PDFs, etc.) served through [`app/api/offering-assets/[offeringSlug]/[...path]/route.ts`](../app/api/offering-assets/%5BofferingSlug%5D/%5B...path%5D/route.ts). Same Clerk + allowlist checks as lessons.

## Sites (`site.yaml` + `pages/`)

Path: **`content/sites/<siteSlug>/`**

- **`site.yaml`** — validated by [`lib/sites.ts`](../lib/sites.ts). Required: **`title`** (non-empty string), **`navigation`** (array; may be empty). Each nav item has **`title`** and **`page`** (`index` for the home file, or any safe slug matching a page file). Optional **`visibility`**: `private` \| `public` \| `unlisted` (omitted → **`private`**). **`loadSite`** also requires **`pages/index.mdx`** and that every **`navigation[].page`** resolves to an existing **`pages/<page>.mdx`** (for `index`, **`pages/index.mdx`**).
- **`pages/index.mdx`** — rendered at **`/s/<siteSlug>`**.
- **`pages/<pageSlug>.mdx`** — rendered at **`/s/<siteSlug>/<pageSlug>`** (requests to **`/s/<siteSlug>/index`** redirect to **`/s/<siteSlug>`**).

Public routing mirrors offerings: **`private`** yields **404** on `/s/*`; **`unlisted`** sets **`robots: noindex, nofollow`**.

### `assets/` (sites)

Path: **`content/sites/<siteSlug>/assets/`**

Optional binaries (images, PDFs, text files, etc.). Served via [**`/api/site-assets/[siteSlug]/[...path]`**](../app/api/site-assets/%5BsiteSlug%5D/%5B...path%5D/route.ts):

- **Public or unlisted** site: assets are served **without Clerk** (same visibility as `/s/*` HTML — intentionally public at the asset URL once linked from public pages).
- **Private** site: requires **Clerk** + **site admin** access (`sites` row in [`config/admins.yaml`](../config/admins.yaml)); see [Auth and visibility — Site asset API](./auth-and-visibility.md#site-asset-api).

MDX under **`pages/`** rewrites **`](../assets/...`** to that API (see [`prepareSiteMdxSource`](../lib/mdx-site-compile.tsx)). Path segments must satisfy **[`isSafeAssetSegment`](../lib/slug.ts)** after URL decoding.

Site MDX uses [`lib/mdx-site-compile.tsx`](../lib/mdx-site-compile.tsx) — **`SiteImage`** / default **`img`**, callouts, math — not lesson-only components (`CourseImage`, `Quiz`, etc.).

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

Slugs for offerings, modules, and lessons must satisfy [`isSafeSlug`](../lib/slug.ts) / `assertSafeSlug`: practical constraint is lowercase URL-safe segments (letters, digits, hyphens) consistent with route params and file paths. Invalid slugs yield validation errors at load time or `notFound()` in routes. **Site** page slugs (except the logical name **`index`**) follow the same rule.

**Reserved segment:** **`search`** — `/offerings/[offeringSlug]/search` is the lesson search page ([Architecture — Search](./architecture.md#search)), so **`search`** must not be used as a lesson slug.

## See also

- [Architecture](./architecture.md)
- [Auth and visibility](./auth-and-visibility.md)
- [MDX authoring](./mdx-authoring.md)
