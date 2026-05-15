# Course platform

Small LMS prototype: course metadata in YAML under `content/courses`, lesson bodies in MDX, rendered with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote). Course chrome (module/lesson sidebar) lives in [`app/courses/[courseSlug]/layout.tsx`](app/courses/[courseSlug]/layout.tsx).

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.13+ (recommended for Next.js 16 / ESLint tooling)

## Run locally

```bash
npm install
npm run dev
```

Try [lesson 1](http://localhost:3000/courses/investing-basics/lesson-1), [lesson 2](http://localhost:3000/courses/investing-basics/lesson-2), [lesson 3](http://localhost:3000/courses/investing-basics/lesson-3).

The home page at `/` links to lesson 1.

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

No database, payments, auth, or real video/file protection yet.
