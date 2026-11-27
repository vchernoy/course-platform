# Private content repository

This repository is **public**. Real students, admins and paid course material belong in a separate **private** repository that the site loads at build time. Related: [Content layout](./content-layout.md), [Auth and visibility](./auth-and-visibility.md).

## How it works

- The private repo uses the same layout as this one:

  ```text
  config/students.yaml          # real students → replaces the public sample file
  config/admins.yaml            # real admins   → replaces the public sample file
  content/offerings/<slug>/...  # private courses and webinars
  content/sites/<slug>/...      # optional private or extra sites
  ```

- Before `next build`, the npm `prebuild` script ([`scripts/sync-private-content.mjs`](../scripts/sync-private-content.mjs)) clones the private repo into `private-content/` (gitignored), using a read-only GitHub token.
- [`lib/content-roots.ts`](../lib/content-roots.ts) reads from both roots:
  - **Offerings and sites** are merged. The same slug in both repos is an error, so rename one.
  - **`config/students.yaml` and `config/admins.yaml`** from the private repo **replace** the public ones when present. Public sample users then have no access.
- `next.config.ts` bundles `private-content/**` into the server functions, so Vercel serves it like the public content.
- Students' access rules are unchanged: an offering is visible to an email listed for it in `students.yaml`, with `visibility` controlling public pages ([Auth and visibility](./auth-and-visibility.md)).

## One-time setup

1. **Create the private repo**, e.g. `vchernoy/course-platform-private`, and give it the layout above. To start, copy this repo's `config/students.yaml` and `config/admins.yaml` into it. Add your courses under `content/offerings/` (copy a sample offering folder to begin).
2. **Create a read-only token.** On GitHub go to Settings → Developer settings → Fine-grained tokens → Generate new token.
   - Repository access: *Only select repositories* → the private repo.
   - Permissions: *Contents: Read-only* (Metadata: read-only is added automatically).
   - Pick an expiration and put a reminder in your calendar to renew it. When it expires, builds fail with a clear message, while the running site keeps working.
3. **Set Vercel environment variables** (Project → Settings → Environment Variables) for Production and Preview:

   | Name | Value |
   |------|-------|
   | `PRIVATE_CONTENT_REPO` | `vchernoy/course-platform-private` |
   | `PRIVATE_CONTENT_TOKEN` | the token from step 2 (mark it *Sensitive*) |
   | `PRIVATE_CONTENT_REF` | optional branch or tag, default is the repo's default branch |

4. **Redeploy** (Deployments → ⋯ → Redeploy). The build log shows a line like:
   `[private-content] Synced vchernoy/course-platform-private into private-content: config/students.yaml, config/admins.yaml, 1 offering folder(s).`
5. **Redeploy automatically when the private repo changes.**
   - In Vercel, go to Project → Settings → Git → **Deploy Hooks** and create a hook for the `main` branch.
   - In the private repo, go to Settings → Secrets and variables → Actions and add a secret named `VERCEL_DEPLOY_HOOK` with the hook URL.
   - Add this workflow to the private repo:

   ```yaml
   # .github/workflows/redeploy.yml (in the PRIVATE repo)
   name: Redeploy site
   on:
     push:
       branches: [main]
   jobs:
     redeploy:
       runs-on: ubuntu-latest
       steps:
         - run: curl -fsS -X POST "$HOOK" > /dev/null
           env:
             HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}
   ```

   Now granting access is a one-line edit to `config/students.yaml` in the private repo. The site picks it up about a minute later.

6. **Remove the real emails from this public repo.** Once the live site runs on the private repo, replace this repo's `config/*.yaml` with `example.com` sample users. Old commits still contain the emails; rewriting history is optional.

## Behaviour and failure modes

| Situation | Result |
|-----------|--------|
| `PRIVATE_CONTENT_REPO` unset (local dev, CI) | Sync is skipped; only public sample content is used. |
| Repo set but token missing, invalid or expired | **Build fails** with `[private-content] …`. The last good deployment keeps serving. This is deliberate, so a deploy can't silently drop all students. |
| Repo has none of `config/students.yaml`, `config/admins.yaml`, `content/offerings`, `content/sites` | Build fails (probably the wrong repo). |
| Same offering or site slug in both repos | Requests that list offerings or sites fail with a "Duplicate … slug" error. Rename one. |

## Local development with private content

Either clone the private repo into `private-content/` yourself:

```bash
git clone git@github.com:vchernoy/course-platform-private.git private-content
npm run dev
```

or point `PRIVATE_CONTENT_DIR` at an existing checkout (for example in `.env.local`, `PRIVATE_CONTENT_DIR=../course-platform-private`).

`npm run sync:private` runs the same sync as the build, which is useful to test a token: set `PRIVATE_CONTENT_REPO` and `PRIVATE_CONTENT_TOKEN` in your shell first.

## Admin editing

**Local publish** in `/admin` writes to whichever root holds the offering or site. For a private offering that's `private-content/…`, which you then commit in the private repo. On Vercel, local publish is disabled as before. Publishing straight to GitHub is tracked in #19.
