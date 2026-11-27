import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  allCollectionDirs,
  contentRoots,
  customerConfigFiles,
  customerOfOffering,
  customerOfSite,
  listCollectionSlugs,
  offeringDir,
} from "../lib/content-roots";
import { listOfferingSlugs, loadLessonSource, loadOffering } from "../lib/offerings";
import { listSiteSlugs } from "../lib/sites";
import { emailHasOfferingAccess, loadStudentsForCustomer } from "../lib/students";
import {
  canAdminAccessOffering,
  canAdminAccessSite,
  canAdminMutateOffering,
  emailIsAdmin,
  listAdminAllowedOfferingSlugs,
  listAdminAllowedSiteSlugs,
} from "../lib/admin-auth";
import { assertWritablePublishedMdxPath } from "../lib/drafts/publish-local";

const OFFERING_YAML = (title: string) =>
  `title: "${title}"\nformat: course\nmodules:\n  - slug: module-1\n    title: M\n    lessons:\n      - slug: lesson-1\n        title: L\n`;

function write(file: string, body: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}

function addOffering(root: string, slug: string, title = slug) {
  write(path.join(root, "content/offerings", slug, "offering.yaml"), OFFERING_YAML(title));
  write(path.join(root, "content/offerings", slug, "module-1/lesson-1.mdx"), `# ${title}\n`);
}

function addSite(root: string, slug: string) {
  write(path.join(root, "content/sites", slug, "site.yaml"), `title: "${slug}"\nnavigation: []\n`);
  write(path.join(root, "content/sites", slug, "pages/index.mdx"), "Hello\n");
}

function students(root: string, rows: Array<[string, string[]]>) {
  write(
    path.join(root, "config/students.yaml"),
    "students:\n" + rows.map(([e, o]) => `  - email: ${e}\n    offerings: [${o.join(", ")}]\n`).join("")
  );
}

function admins(root: string, rows: Array<[string, string, string, string?]>) {
  write(
    path.join(root, "config/admins.yaml"),
    "admins:\n" +
      rows
        .map(
          ([email, role, type, slug]) =>
            `  - email: ${email}\n    assignments:\n      - role: ${role}\n        scope:\n          type: ${type}\n` +
            (slug ? `          slug: ${slug}\n` : "")
        )
        .join("")
  );
}

let tmp: string;
let app: string;
const origCwd = process.cwd();

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "content-roots-")));
  app = path.join(tmp, "app");
  fs.mkdirSync(app, { recursive: true });
  process.chdir(app);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("without config/sources.yaml", () => {
  it("uses this repository as the only source", () => {
    addOffering(app, "sample-course");
    students(app, [["sample@example.com", ["sample-course"]]]);
    assert.deepEqual(
      contentRoots().map((r) => `${r.customer}/${r.sourceId}`),
      ["default/self"]
    );
    assert.deepEqual(listOfferingSlugs(), ["sample-course"]);
    assert.equal(emailHasOfferingAccess("sample@example.com", "sample-course"), true);
  });

  it("falls back to a path in this repo for unknown slugs", () => {
    assert.equal(offeringDir("nope"), path.join(app, "content/offerings/nope"));
    assert.throws(() => loadOffering("nope"), /Offering not found: nope/);
  });
});

describe("several sources and customers", () => {
  // Customer "me": this repo (public samples) + a users repo + two course repos.
  // Customer "acme": one repo with its own users, admins and course.
  const dirs = {
    users: "../me-users",
    courseA: "../me-course-a",
    courseB: "../me-course-b",
    acme: "../acme",
  };

  beforeEach(() => {
    write(
      path.join(app, "config/sources.yaml"),
      `customers:
  - id: me
    sources:
      - self: true
      - dir: ${dirs.users}
        id: users
      - dir: ${dirs.courseA}
        id: course-a
      - dir: ${dirs.courseB}
        id: course-b
        path: content-root
  - id: acme
    sources:
      - dir: ${dirs.acme}
`
    );
    const r = (d: string) => path.resolve(app, d);

    addOffering(app, "public-webinar");
    addSite(app, "demo-site");
    students(app, [["tester@example.com", ["public-webinar"]]]);
    admins(app, [["owner@me.test", "owner", "platform"]]);

    students(r(dirs.users), [
      ["Ann@Example.com", ["course-a-2027"]],
      ["bob@example.com", ["course-a-2027", "course-b-2027"]],
    ]);

    addOffering(r(dirs.courseA), "course-a-2027", "Course A");
    // Course B's own students file adds Ann to course B (union with the users repo).
    const courseBRoot = path.join(r(dirs.courseB), "content-root");
    addOffering(courseBRoot, "course-b-2027", "Course B");
    students(courseBRoot, [["ann@example.com", ["course-b-2027"]]]);
    admins(courseBRoot, [["ta@me.test", "editor", "offering", "course-b-2027"]]);

    addOffering(r(dirs.acme), "acme-course");
    addSite(r(dirs.acme), "acme-site");
    // Acme's files mention a slug of the other customer; that must not grant anything.
    students(r(dirs.acme), [
      ["carol@acme.test", ["acme-course"]],
      ["mallory@acme.test", ["course-a-2027"]],
    ]);
    admins(r(dirs.acme), [["boss@acme.test", "owner", "platform"]]);
  });

  it("loads every source, in order", () => {
    assert.deepEqual(
      contentRoots().map((r) => `${r.customer}/${r.sourceId}`),
      ["me/self", "me/users", "me/course-a", "me/course-b", "acme/acme"]
    );
  });

  it("combines offerings and sites from all sources", () => {
    assert.deepEqual(listOfferingSlugs(), ["acme-course", "course-a-2027", "course-b-2027", "public-webinar"]);
    assert.deepEqual(listSiteSlugs(), ["acme-site", "demo-site"]);
    assert.deepEqual(listCollectionSlugs("offerings", "acme"), ["acme-course"]);
    assert.equal(loadOffering("course-b-2027").title, "Course B");
    assert.equal(loadLessonSource("course-a-2027", "module-1", "lesson-1"), "# Course A\n");
    assert.equal(customerOfOffering("course-b-2027"), "me");
    assert.equal(customerOfSite("acme-site"), "acme");
  });

  it("unions students files within a customer", () => {
    assert.equal(customerConfigFiles("me", "students.yaml").length, 3);
    assert.equal(emailHasOfferingAccess("ann@example.com", "course-a-2027"), true);
    assert.equal(emailHasOfferingAccess("ann@example.com", "course-b-2027"), true);
    assert.equal(emailHasOfferingAccess("bob@example.com", "course-b-2027"), true);
    assert.equal(emailHasOfferingAccess("tester@example.com", "public-webinar"), true);
    assert.equal(emailHasOfferingAccess("tester@example.com", "course-a-2027"), false);
    const ann = loadStudentsForCustomer("me").students.find((s) => s.email.toLowerCase() === "ann@example.com");
    assert.deepEqual(ann?.offerings, ["course-a-2027", "course-b-2027"]);
  });

  it("never lets one customer's students file grant another customer's offering", () => {
    assert.equal(emailHasOfferingAccess("carol@acme.test", "acme-course"), true);
    assert.equal(emailHasOfferingAccess("mallory@acme.test", "course-a-2027"), false);
    assert.equal(emailHasOfferingAccess("ann@example.com", "acme-course"), false);
  });

  it("scopes admins to their own customer", () => {
    assert.equal(emailIsAdmin("owner@me.test"), true);
    assert.equal(emailIsAdmin("boss@acme.test"), true);
    assert.equal(canAdminAccessOffering("owner@me.test", "course-b-2027"), true);
    assert.equal(canAdminAccessOffering("owner@me.test", "acme-course"), false);
    assert.equal(canAdminAccessSite("owner@me.test", "acme-site"), false);
    assert.equal(canAdminAccessOffering("boss@acme.test", "course-a-2027"), false);
    assert.equal(canAdminMutateOffering("boss@acme.test", "acme-course"), true);
    assert.equal(canAdminMutateOffering("ta@me.test", "course-b-2027"), true);
    assert.equal(canAdminMutateOffering("ta@me.test", "course-a-2027"), false);

    const all = listOfferingSlugs();
    assert.deepEqual(listAdminAllowedOfferingSlugs("owner@me.test", all), ["course-a-2027", "course-b-2027", "public-webinar"]);
    assert.deepEqual(listAdminAllowedOfferingSlugs("boss@acme.test", all), ["acme-course"]);
    assert.deepEqual(listAdminAllowedSiteSlugs("boss@acme.test", listSiteSlugs()), ["acme-site"]);
  });

  it("rejects the same slug in two sources, even across customers", () => {
    addOffering(path.resolve(app, dirs.acme), "course-a-2027");
    assert.throws(() => listCollectionSlugs("offerings"), /Duplicate offerings slug "course-a-2027"/);
  });

  it("skips sources whose folder is missing", () => {
    fs.rmSync(path.resolve(app, dirs.courseA), { recursive: true });
    assert.deepEqual(
      contentRoots().map((r) => r.sourceId),
      ["self", "users", "course-b", "acme"]
    );
    assert.equal(emailHasOfferingAccess("ann@example.com", "course-a-2027"), false);
  });

  it("allows local publish writes only inside content collections", () => {
    const lesson = path.join(path.resolve(app, dirs.courseA), "content/offerings/course-a-2027/module-1/lesson-1.mdx");
    assert.ok(allCollectionDirs().includes(path.join(path.resolve(app, dirs.acme), "content/sites")));
    assert.doesNotThrow(() => assertWritablePublishedMdxPath(lesson));
    assert.throws(() => assertWritablePublishedMdxPath(path.join(path.resolve(app, dirs.users), "config/students.yaml")));
  });
});
