/**
 * Regressions for the PR #27 review: symlinks across sources, duplicate slugs on direct lookups,
 * and items outside the configured sources.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { customerOfOffering, findCollectionItem, offeringDir, siteDir } from "../lib/content-roots";
import { listOfferingSlugs, loadLessonSource, loadOffering } from "../lib/offerings";
import { listSiteSlugs, loadSite } from "../lib/sites";
import { safeAssetFilePath } from "../lib/offering-assets";
import { safeSiteAssetFilePath } from "../lib/site-assets";
import { emailHasOfferingAccess, loadStudentsForCustomer } from "../lib/students";
import { canAdminAccessOffering } from "../lib/admin-auth";
import { loadAdminsForCustomer } from "../lib/admins";
import { assertWritablePublishedMdxPath } from "../lib/drafts/publish-local";

function write(file: string, body: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}

function link(target: string, at: string) {
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.symlinkSync(target, at);
}

function addOffering(root: string, slug: string) {
  write(
    path.join(root, "content/offerings", slug, "offering.yaml"),
    `title: "${slug}"\nformat: course\nmodules:\n  - slug: m\n    title: M\n    lessons:\n      - slug: l\n        title: L\n`
  );
  write(path.join(root, "content/offerings", slug, "m/l.mdx"), `# ${slug}\n`);
}

function addSite(root: string, slug: string) {
  write(path.join(root, "content/sites", slug, "site.yaml"), `title: "${slug}"\nnavigation: []\n`);
  write(path.join(root, "content/sites", slug, "pages/index.mdx"), "Hi\n");
  write(path.join(root, "content/sites", slug, "assets/logo.svg"), "<svg/>");
}

let tmp: string;
let app: string;
let alpha: string;
let beta: string;
const origCwd = process.cwd();

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "isolation-")));
  app = path.join(tmp, "app");
  alpha = path.join(tmp, "alpha");
  // beta lives INSIDE the app folder, like external-content/ clones do, to cover nested roots.
  beta = path.join(app, "nested", "beta");
  fs.mkdirSync(app, { recursive: true });
  process.chdir(app);
  write(
    path.join(app, "config/sources.yaml"),
    `customers:
  - id: alpha
    sources:
      - self: true
      - dir: ../alpha
  - id: beta
    sources:
      - dir: nested/beta
`
  );
  addOffering(app, "self-course");
  addOffering(alpha, "alpha-course");
  write(path.join(alpha, "content/offerings/alpha-course/assets/ok.txt"), "fine");
  write(path.join(alpha, "config/students.yaml"), "students:\n  - email: a@alpha.test\n    offerings: [alpha-course]\n");
  write(
    path.join(alpha, "config/admins.yaml"),
    "admins:\n  - email: boss@alpha.test\n    assignments:\n      - role: owner\n        scope:\n          type: platform\n"
  );
  addOffering(beta, "beta-course");
  write(path.join(beta, "config/students.yaml"), "students:\n  - email: secret@beta.test\n    offerings: [beta-course]\n");
  write(
    path.join(beta, "config/admins.yaml"),
    "admins:\n  - email: boss@beta.test\n    assignments:\n      - role: owner\n        scope:\n          type: platform\n"
  );
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("symlinks across sources (P0)", () => {
  it("does not serve another customer's students.yaml through an asset symlink", () => {
    link(path.join(beta, "config/students.yaml"), path.join(alpha, "content/offerings/alpha-course/assets/leak.yaml"));
    assert.equal(safeAssetFilePath("alpha-course", ["leak.yaml"]), null);
  });

  it("does not serve files outside assets/ of the same source", () => {
    link(path.join(alpha, "config/students.yaml"), path.join(alpha, "content/offerings/alpha-course/assets/own.yaml"));
    assert.equal(safeAssetFilePath("alpha-course", ["own.yaml"]), null);
  });

  it("still serves a regular asset", () => {
    const p = safeAssetFilePath("alpha-course", ["ok.txt"]);
    assert.equal(p, path.join(alpha, "content/offerings/alpha-course/assets/ok.txt"));
  });

  it("refuses a lesson that links into another source", () => {
    fs.rmSync(path.join(alpha, "content/offerings/alpha-course/m/l.mdx"));
    link(path.join(beta, "content/offerings/beta-course/m/l.mdx"), path.join(alpha, "content/offerings/alpha-course/m/l.mdx"));
    assert.throws(() => loadLessonSource("alpha-course", "m", "l"), /links outside its content source/);
  });

  it("refuses this repo's content linking into a source nested inside it", () => {
    fs.rmSync(path.join(app, "content/offerings/self-course/m/l.mdx"));
    link(path.join(beta, "config/students.yaml"), path.join(app, "content/offerings/self-course/m/l.mdx"));
    assert.throws(() => loadLessonSource("self-course", "m", "l"), /links outside its content source/);
  });

  it("refuses config files that link to another customer", () => {
    fs.rmSync(path.join(alpha, "config/admins.yaml"));
    link(path.join(beta, "config/admins.yaml"), path.join(alpha, "config/admins.yaml"));
    assert.throws(() => loadAdminsForCustomer("alpha"), /links outside its content source/);
    // Beta's own admins are unaffected.
    assert.equal(loadAdminsForCustomer("beta").admins[0]?.email, "boss@beta.test");
  });

  it("refuses an offering folder that is a symlink to another customer's offering", () => {
    link(path.join(beta, "content/offerings/beta-course"), path.join(alpha, "content/offerings/stolen"));
    assert.throws(() => loadOffering("stolen"), /links outside its content source/);
  });

  it("refuses local publish through a symlink into another source", () => {
    const lesson = path.join(alpha, "content/offerings/alpha-course/m/l.mdx");
    fs.rmSync(lesson);
    link(path.join(beta, "content/offerings/beta-course/m/l.mdx"), lesson);
    assert.throws(() => assertWritablePublishedMdxPath(lesson), /links outside its content source/);
  });

  it("keeps working when no symlinks are involved", () => {
    assert.equal(emailHasOfferingAccess("a@alpha.test", "alpha-course"), true);
    assert.equal(emailHasOfferingAccess("secret@beta.test", "beta-course"), true);
    assert.equal(loadStudentsForCustomer("alpha").students.length, 1);
  });
});

describe("duplicate slugs on direct lookups (P1)", () => {
  beforeEach(() => addOffering(beta, "alpha-course"));

  it("rejects instead of picking the first source", () => {
    assert.throws(() => findCollectionItem("offerings", "alpha-course"), /Duplicate offerings slug "alpha-course"/);
    assert.throws(() => customerOfOffering("alpha-course"), /Duplicate/);
    assert.throws(() => loadOffering("alpha-course"), /Duplicate/);
    assert.throws(() => emailHasOfferingAccess("a@alpha.test", "alpha-course"), /Duplicate/);
    assert.throws(() => canAdminAccessOffering("boss@alpha.test", "alpha-course"), /Duplicate/);
    assert.throws(() => safeAssetFilePath("alpha-course", ["ok.txt"]), /Duplicate/);
  });

  it("leaves other slugs working", () => {
    assert.equal(customerOfOffering("beta-course"), "beta");
  });
});

describe("items outside the configured sources", () => {
  beforeEach(() => {
    // Only alpha's folder is registered; this repo's own content/ is NOT a source.
    write(path.join(app, "config/sources.yaml"), "customers:\n  - id: alpha\n    sources:\n      - dir: ../alpha\n");
    addSite(app, "hidden-site");
  });

  it("does not fall back to this repo's content/", () => {
    assert.deepEqual(listSiteSlugs(), []);
    assert.equal(siteDir("hidden-site"), null);
    assert.throws(() => loadSite("hidden-site"), /Site not found: hidden-site/);
    assert.equal(safeSiteAssetFilePath("hidden-site", ["logo.svg"]), null);
    assert.equal(offeringDir("self-course"), null);
    assert.throws(() => loadOffering("self-course"), /Offering not found: self-course/);
    assert.deepEqual(listOfferingSlugs(), ["alpha-course"]);
  });
});
