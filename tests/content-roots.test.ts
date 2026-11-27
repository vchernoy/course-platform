import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  allCollectionDirs,
  configFilePath,
  contentRoots,
  listCollectionSlugs,
  offeringDir,
  resolveCollectionItem,
  siteDir,
} from "../lib/content-roots";
import { listOfferingSlugs, loadLessonSource, loadOffering } from "../lib/offerings";
import { listSiteSlugs } from "../lib/sites";
import { emailHasOfferingAccess } from "../lib/students";
import { assertWritablePublishedMdxPath } from "../lib/drafts/publish-local";

const OFFERING_YAML = (title: string) =>
  `title: "${title}"\nformat: course\nmodules:\n  - slug: module-1\n    title: M\n    lessons:\n      - slug: lesson-1\n        title: L\n`;

function write(file: string, body: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}

function addOffering(root: string, slug: string, title: string) {
  write(path.join(root, "content/offerings", slug, "offering.yaml"), OFFERING_YAML(title));
  write(path.join(root, "content/offerings", slug, "module-1/lesson-1.mdx"), `# ${title}\n`);
}

function addSite(root: string, slug: string) {
  write(path.join(root, "content/sites", slug, "site.yaml"), `title: "${slug}"\nnavigation: []\n`);
  write(path.join(root, "content/sites", slug, "pages/index.mdx"), "Hello\n");
}

let tmp: string;
let publicRoot: string;
let privateRoot: string;
const origCwd = process.cwd();
const origEnv = process.env.PRIVATE_CONTENT_DIR;

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "content-roots-")));
  publicRoot = path.join(tmp, "app");
  privateRoot = path.join(publicRoot, "private-content");
  fs.mkdirSync(publicRoot, { recursive: true });
  process.chdir(publicRoot);
  delete process.env.PRIVATE_CONTENT_DIR;

  addOffering(publicRoot, "sample-course", "Public sample");
  addSite(publicRoot, "demo-site");
  write(
    path.join(publicRoot, "config/students.yaml"),
    "students:\n  - email: sample@example.com\n    offerings: [sample-course]\n"
  );
});

afterEach(() => {
  process.chdir(origCwd);
  if (origEnv === undefined) delete process.env.PRIVATE_CONTENT_DIR;
  else process.env.PRIVATE_CONTENT_DIR = origEnv;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("content roots without private content", () => {
  it("uses only the public root", () => {
    assert.deepEqual(
      contentRoots().map((r) => r.kind),
      ["public"]
    );
    assert.deepEqual(listOfferingSlugs(), ["sample-course"]);
    assert.equal(configFilePath("students.yaml"), path.join(publicRoot, "config/students.yaml"));
    assert.equal(emailHasOfferingAccess("sample@example.com", "sample-course"), true);
  });

  it("falls back to the public path for unknown slugs", () => {
    assert.equal(offeringDir("nope"), path.join(publicRoot, "content/offerings/nope"));
    assert.throws(() => loadOffering("nope"), /Offering not found: nope/);
  });
});

describe("content roots with private content", () => {
  beforeEach(() => {
    addOffering(privateRoot, "paid-course-2027-01", "Paid course");
    addSite(privateRoot, "promo");
    write(
      path.join(privateRoot, "config/students.yaml"),
      "students:\n  - email: Student@Example.com\n    offerings: [paid-course-2027-01]\n"
    );
  });

  it("merges offerings and sites from both roots", () => {
    assert.deepEqual(listOfferingSlugs(), ["paid-course-2027-01", "sample-course"]);
    assert.deepEqual(listSiteSlugs(), ["demo-site", "promo"]);
    assert.equal(offeringDir("paid-course-2027-01"), path.join(privateRoot, "content/offerings/paid-course-2027-01"));
    assert.equal(siteDir("demo-site"), path.join(publicRoot, "content/sites/demo-site"));
    assert.equal(loadOffering("paid-course-2027-01").title, "Paid course");
    assert.equal(loadLessonSource("paid-course-2027-01", "module-1", "lesson-1"), "# Paid course\n");
    assert.equal(resolveCollectionItem("offerings", "sample-course").root.kind, "public");
  });

  it("private config files replace public ones", () => {
    assert.equal(configFilePath("students.yaml"), path.join(privateRoot, "config/students.yaml"));
    assert.equal(emailHasOfferingAccess("student@example.com", "paid-course-2027-01"), true);
    assert.equal(emailHasOfferingAccess("sample@example.com", "sample-course"), false);
  });

  it("keeps public config when the private root lacks that file", () => {
    assert.equal(configFilePath("admins.yaml"), path.join(publicRoot, "config/admins.yaml"));
  });

  it("rejects the same slug in both roots", () => {
    addOffering(privateRoot, "sample-course", "Shadow");
    assert.throws(() => listCollectionSlugs("offerings"), /Duplicate offerings slug "sample-course"/);
  });

  it("honors PRIVATE_CONTENT_DIR", () => {
    const other = path.join(tmp, "elsewhere");
    addOffering(other, "other-course", "Other");
    process.env.PRIVATE_CONTENT_DIR = other;
    assert.deepEqual(listOfferingSlugs(), ["other-course", "sample-course"]);
  });

  it("allows local publish writes only inside content collections", () => {
    assert.ok(allCollectionDirs().includes(path.join(privateRoot, "content/offerings")));
    assert.doesNotThrow(() =>
      assertWritablePublishedMdxPath(path.join(privateRoot, "content/offerings/paid-course-2027-01/module-1/lesson-1.mdx"))
    );
    assert.throws(() => assertWritablePublishedMdxPath(path.join(privateRoot, "config/students.yaml")));
  });
});
