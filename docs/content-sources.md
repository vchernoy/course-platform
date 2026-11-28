# Content sources: customers, repos, users and courses

Users and course content can come from **any number of repositories**, public or private, grouped by **customer**. The list lives in [`config/sources.yaml`](../config/sources.yaml) in this repository. Related: [Content layout](./content-layout.md), [Auth and visibility](./auth-and-visibility.md).

## Model

```text
customer "vchernoy"
  ├─ self                               (this repo: samples, public webinars)
  ├─ vchernoy/investing-users           (private: students.yaml for all classes)
  ├─ vchernoy/investing-basics-2027-01  (private: one paid course, maybe its own students.yaml)
  └─ vchernoy/investing-public-events   (public: free webinars, promo site)
customer "acme-academy"
  └─ acme/academy-content               (private: their users, admins and courses)
```

Every source has the same layout, and **each part is optional**. A repo can hold only users, only one course, or everything:

```text
config/students.yaml
config/admins.yaml
content/offerings/<slug>/...   # courses, webinars (see content-layout.md)
content/sites/<slug>/...       # public promo or blog sites
```

**Rules**

- **Union, never replace.** All of a customer's `students.yaml` files are combined. The same email in several files gets the union of its offerings. `admins.yaml` files are combined the same way.
- **Customers are isolated.** A customer's students and admins files only apply to that customer's offerings and sites:
  - A student listed in customer A's files never gets access to customer B's course, even if the slug is listed.
  - An admin's `platform` scope means "all of this customer's offerings and sites".
- **Slugs are global.** Offering and site slugs appear in URLs, so they must be unique across all sources and customers. A duplicate is reported as an error that names both sources.
- **Visibility is per offering or site,** as before: `private` content needs sign-in plus enrollment; `public` and `unlisted` have public pages. A public repo can still contain private offerings, but anyone can read their source on GitHub, so put paid material in private repos.

## `config/sources.yaml`

```yaml
customers:
  - id: vchernoy                 # lowercase slug, unique
    title: Investing classes     # optional
    sources:
      - self: true               # this repository (at most one customer may list it)
      - repo: vchernoy/investing-users
        tokenEnv: GITHUB_TOKEN_VCHERNOY
      - repo: vchernoy/investing-basics-2027-01
        tokenEnv: GITHUB_TOKEN_VCHERNOY
        ref: main                # optional branch or tag
      - repo: vchernoy/investing-public-events   # public: no token needed
      - repo: vchernoy/monorepo
        path: classes/2027       # optional: use a subfolder as the source root
        id: classes-2027         # optional: short name (default derived from repo)
      - dir: ../local-course     # a folder on disk (local development, self-hosting)
```

Optional per customer: `bunnyLibraries: ["123456"]`, the Bunny Stream libraries whose lesson recordings this customer may sign ([Bunny Stream](./video-bunny.md)).

`tokenEnv` is the **name** of an environment variable, never the token itself. The file is validated, and a value that looks like a token is rejected.

Without `config/sources.yaml`, this repository is the only source (customer `default`).

## How loading works

1. Before `next build`, the npm `prebuild` script runs [`scripts/sync-sources.ts`](../scripts/sync-sources.ts). It shallow-clones every `repo:` source into `external-content/<customer>/<source-id>/` (gitignored). The token is passed as a one-off HTTP header, so it's never stored in the clone, the git config or logs. The build log lists each source and what it provides:

   ```text
   [content-sources] vchernoy/self (self): students, admins, 2 offering(s), 1 site(s)
   [content-sources] vchernoy/vchernoy-investing-users (vchernoy/investing-users): students
   ```

2. `next.config.ts` bundles `content/`, `config/` and `external-content/` into the server functions.
3. At request time, [`lib/content-roots.ts`](../lib/content-roots.ts) combines all sources. [`lib/students.ts`](../lib/students.ts) and [`lib/admin-auth.ts`](../lib/admin-auth.ts) check access against the customer that owns the offering or site.

**When a source can't be fetched**

- **On Vercel** (or with `SOURCES_STRICT=1`), the build fails and names the source. The previous deployment keeps serving, so a deploy can't silently drop a customer's students or courses.
- **Locally**, the source is skipped with a warning, so you can work on public content without tokens.

## Adding a repository

1. **Create the repo** (private for paid content or user lists) with any of the folders above. To start a course, copy an existing offering folder into `content/offerings/<new-slug>/`.
2. **Private repos only: create a read-only token.** On GitHub go to Settings → Developer settings → Fine-grained tokens.
   - Resource owner: the repo's owner.
   - Repository access: the repos this token should read. One token can cover all of a customer's repos.
   - Permissions: **Contents: Read-only**.
   - Note the expiry date. When it expires, builds fail with a clear message, while the running site keeps working.
3. **Store the token in Vercel** (Project → Settings → Environment Variables, Production and Preview, marked *Sensitive*), under the name you'll use in `tokenEnv`, e.g. `GITHUB_TOKEN_VCHERNOY`.
4. **Add the source** to `config/sources.yaml` under the right customer, and commit (PR) to this repo. The deploy picks it up.
5. **Redeploy when the content repo changes.**
   - In Vercel, go to Project → Settings → Git → **Deploy Hooks** and create a hook for `main`.
   - In each content repo, go to Settings → Secrets and variables → Actions and add a secret named `VERCEL_DEPLOY_HOOK` with the hook URL.
   - Add this workflow to each content repo:

   ```yaml
   # .github/workflows/redeploy.yml (in the CONTENT repo)
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

   Granting a student access is then a one-line edit to a `students.yaml` in the private repo, live about a minute later.

## Adding a customer

Add another entry under `customers:` with its own sources and its own token variable (e.g. `GITHUB_TOKEN_ACME`, a token the customer creates for their own repos). Their students and admins only ever apply to their own offerings and sites.

Today all customers share one domain and one URL space, and are told apart by offering and site slug. A per-customer domain or path prefix is future work (#23).

## Local development

```bash
npm run sync:sources    # clone what you have tokens for (set GITHUB_TOKEN_... in your shell)
npm run dev
```

Or point a `dir:` source at a checkout you already have (for example `dir: ../investing-users`). Sources whose folder is missing are skipped with a console warning.

## Admin editing

**Local publish** in `/admin` writes into whichever source holds the offering or site. For a cloned GitHub source that's the throw-away copy in `external-content/`, so use a `dir:` source pointing at a real checkout when editing locally. On Vercel, local publish is disabled as before. Publishing to GitHub is tracked in #19.
