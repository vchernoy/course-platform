# MDX authoring

Lesson MDX syntax, components, and compile pipeline. Related: [Content layout](./content-layout.md), [Architecture](./architecture.md).

## Lessons

- Files live under `content/offerings/<offeringSlug>/<moduleSlug>/<lessonSlug>.mdx` and must align with `offering.yaml`.
- Rendered only under `/offerings/.../[lessonSlug]` for authenticated, allowlisted users — not on `/p/*`.

## Compile pipeline

Configured in [`app/offerings/[offeringSlug]/[lessonSlug]/page.tsx`](../app/offerings/%5BofferingSlug%5D/%5BlessonSlug%5D/page.tsx):

- **`next-mdx-remote/rsc`** — `compileMDX`, default **`blockJS: true`**
- **remark-directive** + custom remark step for callouts/details ([`lib/mdx-callouts.ts`](../lib/mdx-callouts.ts))
- **remark-math** / **rehype-katex** for LaTeX
- **rehype-slug** — stable `id` on headings (including MDX `#` → `h1`) so URLs like `/offerings/.../lesson#section-id` work
- **rehype-autolink-headings** — hover permalink link prepended only on **`h2`** and **`h3`** (`h1` keeps id without visible permalink glyph)

Markdown links render through [`components/mdx/MdxAnchor.tsx`](../components/mdx/MdxAnchor.tsx); normal URLs are unchanged.

### Heading anchors

| Heading | `id` from slug | Permalink icon |
|---------|----------------|----------------|
| MDX `# ...` → `h1` | Yes | No |
| `##`, `###` → `h2`, `h3` | Yes | Yes (hidden until hover) |

Styling: `.lesson-mdx .heading-permalink` in [`app/globals.css`](../app/globals.css).

### Internal pseudo-links (`lesson:`, `offering:`)

Use Markdown links with special href schemes (resolved at render time; **no** `next/link` required):

| Pattern | Resolves to |
|---------|-------------|
| `lesson:<lessonSlug>` | `/offerings/{currentOffering}/{lessonSlug}` |
| `lesson:<lessonSlug>#<frag>` | same path + hash when fragment is safe |
| `offering:<offeringSlug>` | `/offerings/{offeringSlug}` |
| `offering:<offeringSlug>#<frag>` | overview URL + hash when fragment is safe |
| `offering:<offeringSlug>/<lessonSlug>` | `/offerings/{offeringSlug}/{lessonSlug}` |
| `offering:<offeringSlug>/<lessonSlug>#<frag>` | lesson URL + hash when fragment is safe |

- **`currentOffering`** is always the lesson page’s route slug (same-offering shorthand).
- **Slug segments** must pass [`isSafeSlug`](../lib/slug.ts); malformed pseudo-links are left unchanged (authors see broken navigation rather than inventing paths).
- **`#fragment`**: optional; must match `[a-z0-9]+(?:-[a-z0-9]+)*` and length ≤ `SLUG_MAX_LENGTH`, or the entire href is left unchanged.
- **`http:`**, **`https:`**, **`mailto:`**, **`#local`** fragments only, and other schemes pass through untouched.

Resolver: [`lib/mdx-internal-links.ts`](../lib/mdx-internal-links.ts). Does not bypass Clerk or `students.yaml`; targets are ordinary internal URLs.

### Expression attributes

The remote MDX pipeline removes JSX attributes whose values are JavaScript expressions (security/default). Therefore patterns like `choices={[ "a", "b" ]}` or `answer={0}` are **stripped** before components receive props. Use **string literals** where needed (e.g. JSON in a single-quoted attribute for `Quiz`).

## Wired components

| Tag / pattern | Role |
|---------------|------|
| `<CompoundInterestCalculator />` | Client interactive demo |
| `![alt](../assets/file.png)` | Rewritten to authenticated asset URL |
| `<CourseImage src="..." alt="..." />` | Wrapper resolving offering-relative paths |
| `<VideoPlayer … />` | Vimeo / Cloudflare iframe embed |
| `<DownloadFile assetId="..." />` | Signed-offering file delivery hook |
| `<Quiz … />` | Client-only MCQ; see below |
| Markdown `[text](url)` | `<a>` via [`MdxAnchor`](../components/mdx/MdxAnchor.tsx); supports `lesson:` / `offering:` pseudo-URLs |

Callouts and details use directive syntax (below), not raw MDX tags.

## Quiz

Props: **`question`**, **`choices`** (JSON array **string**), **`answer`** (0-based index as string or number when literal), optional **`explanation`**.

Example:

```mdx
<Quiz
  question="What best describes compound growth?"
  choices='["Returns earn further returns over time","Only the principal grows each period"]'
  answer="0"
  explanation="Reinvested returns participate in future growth."
/>
```

No server persistence: state resets on navigation.

## VideoPlayer

- **Registry:** `<VideoPlayer assetId="lesson-1-recording" />` — id defined in `videos.yaml`.
- **Inline:** `<VideoPlayer provider="vimeo" videoId="..." title="..." />` or `provider="cloudflare" playbackId="..."`.

Optional env **`NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER`** overrides default iframe host; otherwise defaults apply per [`VideoPlayer`](../components/mdx/VideoPlayer.tsx).

Provider notes: Vimeo suits simple iframe embeds; Cloudflare Stream supports richer token patterns later — current code uses plain iframe URLs until signing is implemented server-side.

## CourseImage and markdown images

- Markdown: `![alt](../assets/name.png)` — rewritten for asset API.
- Component: `<CourseImage src="file.png" alt="..." />` — src relative to offering `assets/`.

## Callouts (directives)

Supported container directive names: **`note`**, **`tip`**, **`warning`**, **`danger`**, **`important`**, **`exercise`**.

Default title comes from the directive name; bracket syntax overrides the heading:

```markdown
:::tip
Short tip body.
:::

:::warning[Custom title]
Body text.
:::
```

Close with a line containing only `:::`. Implementation: [`Callout`](../components/mdx/Callout.tsx).

## Details (collapsible)

Native `<details>` via directives:

```markdown
:::details[Optional summary]
Body supports markdown and math.
:::

:::details
Summary defaults to “Details”.
:::
```

Implementation: [`Details`](../components/mdx/Details.tsx).

## LaTeX

- Inline: `$...$`
- Block: `$$` on own lines

Escape literal dollar signs when needed (e.g. `\$100`) to avoid accidental math spans.

## Adding new interactive blocks (philosophy)

- Prefer **small client islands** registered in the lesson page’s MDX component map; keep lesson compilation on the server.
- Author-facing API should stay **declarative** (props / directives) to survive `next-mdx-remote` expression stripping where applicable.
- **Persistence** (scores, progress, analytics) is out of band until an explicit backend exists; avoid implying saved state without wiring.

## See also

- [Architecture](./architecture.md)
- [Auth and visibility](./auth-and-visibility.md)
- [Content layout](./content-layout.md)
