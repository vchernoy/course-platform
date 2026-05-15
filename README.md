# Course platform (Step 0)

Small LMS prototype: course metadata in YAML under `content/courses`, lesson bodies in MDX, rendered with [`next-mdx-remote/rsc`](https://github.com/hashicorp/next-mdx-remote).

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.13+ (recommended for Next.js 16 / ESLint tooling)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/courses/investing-basics/lesson-1](http://localhost:3000/courses/investing-basics/lesson-1).

The home page at `/` links to the same lesson.

## Content layout

- `content/courses/<courseSlug>/course.yaml` — course title and modules (validated at load time).
- `content/courses/<courseSlug>/<moduleSlug>/<lessonSlug>.mdx` — lesson MDX (must match `module.slug` and lesson `slug` from YAML).

### MDX components

These tags are wired in `app/courses/[courseSlug]/[lessonSlug]/page.tsx`:

- `<CompoundInterestCalculator />`
- `<ProtectedVideo assetId="..." />`
- `<DownloadFile assetId="..." />`

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Serve production   |
| `npm run lint` | ESLint (`eslint .`) |

## Out of scope

No database, payments, auth, or real video/file protection yet.
