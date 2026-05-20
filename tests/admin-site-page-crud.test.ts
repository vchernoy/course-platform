import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, it } from "node:test";
import yaml from "yaml";
import {
  assignmentGrantsSiteSlug,
  canAdminMutateSiteFromConfig,
  validateAdminsContent,
  type AdminAssignment,
} from "../lib/admins";
import {
  buildStarterSitePageMdx,
  createSitePageOnDisk,
  deleteSitePageOnDisk,
  tryReadSiteMetaFromYaml,
  validateNewSitePageSlug,
  validatePageTitle,
} from "../lib/admin-site-page-crud";
import {
  LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE,
  localPublishDisabledReason,
  sitePageFilesystemMutationBlockedReason,
} from "../lib/drafts/deployment-policy";
import type { SiteMeta } from "../lib/sites";

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    const val = vars[key];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
  const done = fn();
  return Promise.resolve(done).finally(() => {
    for (const key of Object.keys(vars)) {
      const val = prev[key];
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });
}

function seedMinimalSite(projectRoot: string, siteSlug: string, navAbout: boolean) {
  const root = path.join(projectRoot, "content", "sites", siteSlug);
  const pagesDir = path.join(root, "pages");
  fs.mkdirSync(pagesDir, { recursive: true });
  fs.writeFileSync(path.join(pagesDir, "index.mdx"), "# Home\n\n", "utf8");
  const nav: SiteMeta["navigation"] = [{ title: "Home", page: "index" }];
  if (navAbout) nav.push({ title: "About", page: "about" });
  const meta: SiteMeta = {
    title: "Test site",
    visibility: "public",
    navigation: nav,
  };
  const yamlPath = path.join(root, "site.yaml");
  fs.writeFileSync(
    yamlPath,
    yaml.stringify({
      title: meta.title,
      visibility: meta.visibility,
      navigation: meta.navigation,
    }),
    "utf8"
  );
}

describe("validateNewSitePageSlug / validatePageTitle", () => {
  it("rejects index and invalid slugs", () => {
    assert.equal(validateNewSitePageSlug(""), "Page slug is required.");
    assert.equal(validateNewSitePageSlug("index"), 'The "index" page cannot be created here.');
    assert.match(validateNewSitePageSlug("Bad") ?? "", /lowercase/);
    assert.equal(validateNewSitePageSlug("ok-page"), null);
  });

  it("rejects empty or huge titles", () => {
    assert.equal(validatePageTitle(""), "Title is required.");
    assert.equal(validatePageTitle("     "), "Title is required.");
    assert.match(validatePageTitle("a".repeat(241)) ?? "", /too long/);
    assert.equal(validatePageTitle("Hello"), null);
  });
});

describe("buildStarterSitePageMdx", () => {
  it("uses markdown H1 title", () => {
    assert.equal(buildStarterSitePageMdx("My title"), "# My title\n\n");
  });
});

describe("createSitePageOnDisk / deleteSitePageOnDisk", () => {
  it("creates mdx and optionally updates navigation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-crud-"));
    try {
      const siteSlug = "test-site";
      seedMinimalSite(tmp, siteSlug, false);

      let r = createSitePageOnDisk(tmp, siteSlug, {
        title: "Stuff",
        slug: "stuff",
        addToNavigation: false,
      });
      assert.equal(r.ok, true);
      const mdxPath = path.join(tmp, "content", "sites", siteSlug, "pages", "stuff.mdx");
      assert.ok(fs.existsSync(mdxPath));
      let meta = tryReadSiteMetaFromYaml(tmp, siteSlug)!;
      assert.equal(meta.navigation.length, 1);

      r = createSitePageOnDisk(tmp, siteSlug, {
        title: "About",
        slug: "about",
        addToNavigation: true,
      });
      assert.equal(r.ok, true);
      meta = tryReadSiteMetaFromYaml(tmp, siteSlug)!;
      assert.ok(meta.navigation.some((n) => n.page === "about" && n.title === "About"));

      const dup = createSitePageOnDisk(tmp, siteSlug, {
        title: "About 2",
        slug: "about",
        addToNavigation: false,
      });
      assert.equal(dup.ok, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("rejects duplicate navigation when addToNavigation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-crud-"));
    try {
      const siteSlug = "test-site";
      seedMinimalSite(tmp, siteSlug, true);

      const r = createSitePageOnDisk(tmp, siteSlug, {
        title: "About dup",
        slug: "about",
        addToNavigation: true,
      });
      assert.equal(r.ok, false);
      assert.match(r.error, /already includes page/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("deletes page file and nav entry; blocks index", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-crud-"));
    try {
      const siteSlug = "test-site";
      seedMinimalSite(tmp, siteSlug, true);
      fs.writeFileSync(
        path.join(tmp, "content", "sites", siteSlug, "pages", "about.mdx"),
        "# About\n",
        "utf8"
      );

      let r = deleteSitePageOnDisk(tmp, siteSlug, "index");
      assert.equal(r.ok, false);

      r = deleteSitePageOnDisk(tmp, siteSlug, "about");
      assert.equal(r.ok, true);
      assert.ok(!fs.existsSync(path.join(tmp, "content", "sites", siteSlug, "pages", "about.mdx")));
      const meta = tryReadSiteMetaFromYaml(tmp, siteSlug)!;
      assert.ok(!meta.navigation.some((n) => n.page === "about"));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("sitePageFilesystemMutationBlockedReason", () => {
  it("matches local publish policy on Vercel", async () => {
    await withEnv({ VERCEL: "1" }, () => {
      assert.equal(sitePageFilesystemMutationBlockedReason(), LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE);
      assert.equal(sitePageFilesystemMutationBlockedReason(), localPublishDisabledReason());
    });
  });

  it("is null off Vercel", async () => {
    await withEnv({ VERCEL: undefined }, () => {
      assert.equal(sitePageFilesystemMutationBlockedReason(), null);
    });
  });
});

describe("canAdminMutateSiteFromConfig", () => {
  const editorSite: AdminAssignment = { role: "editor", scope: { type: "site", slug: "demo" } };
  const viewerSite: AdminAssignment = { role: "viewer", scope: { type: "site", slug: "demo" } };
  const editorOffering: AdminAssignment = {
    role: "editor",
    scope: { type: "offering", slug: "some-offering" },
  };
  const editorPlatform: AdminAssignment = { role: "editor", scope: { type: "platform" } };
  const viewerPlatform: AdminAssignment = { role: "viewer", scope: { type: "platform" } };

  it("resource-specific: editor on site can mutate; viewer on site cannot", () => {
    const cfg = validateAdminsContent({
      admins: [{ email: "e@example.com", assignments: [editorSite] }],
    });
    assert.equal(canAdminMutateSiteFromConfig(cfg, "e@example.com", "demo"), true);

    const cfgV = validateAdminsContent({
      admins: [{ email: "v@example.com", assignments: [viewerSite] }],
    });
    assert.equal(canAdminMutateSiteFromConfig(cfgV, "v@example.com", "demo"), false);
  });

  it("offering editor does not mutate site", () => {
    const cfg = validateAdminsContent({
      admins: [{ email: "o@example.com", assignments: [editorOffering] }],
    });
    assert.equal(canAdminMutateSiteFromConfig(cfg, "o@example.com", "demo"), false);
  });

  it("platform editor mutates; platform viewer does not", () => {
    const cfgE = validateAdminsContent({
      admins: [{ email: "p@example.com", assignments: [editorPlatform] }],
    });
    assert.equal(canAdminMutateSiteFromConfig(cfgE, "p@example.com", "any-site"), true);

    const cfgV = validateAdminsContent({
      admins: [{ email: "q@example.com", assignments: [viewerPlatform] }],
    });
    assert.equal(canAdminMutateSiteFromConfig(cfgV, "q@example.com", "any-site"), false);
  });
});

describe("assignmentGrantsSiteSlug", () => {
  it("matches site grant semantics", () => {
    const a: AdminAssignment = { role: "viewer", scope: { type: "site", slug: "x" } };
    assert.equal(assignmentGrantsSiteSlug(a, "x"), true);
    assert.equal(assignmentGrantsSiteSlug(a, "y"), false);
  });
});
