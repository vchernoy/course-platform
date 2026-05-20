import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdminAccessOfferingFromConfig,
  canAdminAccessSiteFromConfig,
  emailIsAdminFromConfig,
  getAdminAccessFromConfig,
  listAdminAllowedOfferingSlugsFromConfig,
  listAdminAllowedSiteSlugsFromConfig,
  validateAdminsContent,
} from "../lib/admins";
import type { AdminsConfig } from "../lib/admins";

const sample: AdminsConfig = validateAdminsContent({
  admins: [
    {
      email: "owner@example.com",
      role: "owner",
      offerings: ["*"],
      sites: ["*"],
    },
    {
      email: "Editor@example.com",
      role: "editor",
      offerings: ["investing-basics-2026-05", "investing-basics-2026-05"],
      sites: ["demo-site"],
    },
    {
      email: "assistant@example.com",
      role: "viewer",
      offerings: ["roth-ira-webinar-2026-04"],
    },
  ],
});

describe("getAdminAccessFromConfig (legacy schema normalized)", () => {
  it("resolves owner with wildcard offerings and sites", () => {
    const a = getAdminAccessFromConfig(sample, "owner@example.com");
    assert.ok(a);
    assert.equal(a.role, "owner");
    assert.equal(a.assignments.length, 2);
    assert.ok(a.assignments.some((x) => x.scope.type === "wildcard_offerings"));
    assert.ok(a.assignments.some((x) => x.scope.type === "wildcard_sites"));
  });

  it("dedupes explicit offering slugs into one assignment shape", () => {
    const a = getAdminAccessFromConfig(sample, "editor@example.com");
    assert.ok(a);
    assert.equal(a.role, "editor");
    const offerings = a.assignments.filter((x) => x.scope.type === "offering");
    assert.equal(offerings.length, 1);
    assert.equal(
      offerings[0]!.scope.type === "offering" ? offerings[0]!.scope.slug : "",
      "investing-basics-2026-05"
    );
  });

  it("omitted sites means no wildcard_sites assignments", () => {
    const a = getAdminAccessFromConfig(sample, "assistant@example.com");
    assert.ok(a);
    assert.equal(a.role, "viewer");
    assert.ok(a.assignments.some((x) => x.scope.type === "offering"));
    assert.ok(!a.assignments.some((x) => x.scope.type === "wildcard_sites" || x.scope.type === "site"));
  });

  it("returns null for unknown email", () => {
    assert.equal(getAdminAccessFromConfig(sample, "nobody@example.com"), null);
  });
});

describe("assignments-only schema", () => {
  const platformCfg = validateAdminsContent({
    admins: [
      {
        email: "pat@example.com",
        assignments: [{ role: "owner", scope: { type: "platform" } }],
      },
    ],
  });

  it("platform owner sees all offerings and sites", () => {
    assert.equal(
      canAdminAccessOfferingFromConfig(platformCfg, "pat@example.com", "anything-goes"),
      true
    );
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(platformCfg, "pat@example.com", ["a", "b"]),
      ["a", "b"]
    );
    assert.equal(canAdminAccessSiteFromConfig(platformCfg, "pat@example.com", "z-site"), true);
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(platformCfg, "pat@example.com", ["z", "y"]),
      ["z", "y"]
    );
  });

  const offeringScoped = validateAdminsContent({
    admins: [
      {
        email: "off@example.com",
        assignments: [
          {
            role: "editor",
            scope: { type: "offering", slug: "only-this-offering" },
          },
        ],
      },
    ],
  });

  it("offering scoped editor sees only that offering", () => {
    assert.equal(
      canAdminAccessOfferingFromConfig(offeringScoped, "off@example.com", "only-this-offering"),
      true
    );
    assert.equal(
      canAdminAccessOfferingFromConfig(offeringScoped, "off@example.com", "other"),
      false
    );
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(offeringScoped, "off@example.com", ["only-this-offering", "x"]),
      ["only-this-offering"]
    );
    assert.equal(canAdminAccessSiteFromConfig(offeringScoped, "off@example.com", "any"), false);
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(offeringScoped, "off@example.com", ["s1"]),
      []
    );
  });

  const siteScoped = validateAdminsContent({
    admins: [
      {
        email: "sites@example.com",
        assignments: [{ role: "editor", scope: { type: "site", slug: "only-this-site" } }],
      },
    ],
  });

  it("site scoped editor sees only that site", () => {
    assert.equal(canAdminAccessOfferingFromConfig(siteScoped, "sites@example.com", "any"), false);
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(siteScoped, "sites@example.com", ["a"]),
      []
    );
    assert.equal(canAdminAccessSiteFromConfig(siteScoped, "sites@example.com", "only-this-site"), true);
    assert.equal(canAdminAccessSiteFromConfig(siteScoped, "sites@example.com", "other"), false);
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(siteScoped, "sites@example.com", ["only-this-site", "x"]),
      ["only-this-site"]
    );
  });
});

describe("emailIsAdminFromConfig", () => {
  it("matches case-insensitively", () => {
    assert.equal(emailIsAdminFromConfig(sample, "EDITOR@EXAMPLE.COM"), true);
    assert.equal(emailIsAdminFromConfig(sample, undefined), false);
  });
});

describe("canAdminAccessOfferingFromConfig", () => {
  it("allows wildcard admin any safe slug", () => {
    assert.equal(canAdminAccessOfferingFromConfig(sample, "owner@example.com", "any-offering-slug"), true);
  });

  it("denies scoped admin other offerings", () => {
    assert.equal(
      canAdminAccessOfferingFromConfig(sample, "assistant@example.com", "investing-basics-2026-05"),
      false
    );
    assert.equal(
      canAdminAccessOfferingFromConfig(sample, "assistant@example.com", "roth-ira-webinar-2026-04"),
      true
    );
  });

  it("denies invalid offering slug param", () => {
    assert.equal(canAdminAccessOfferingFromConfig(sample, "owner@example.com", "../evil"), false);
  });
});

describe("canAdminAccessSiteFromConfig", () => {
  it("allows wildcard sites admin", () => {
    assert.equal(canAdminAccessSiteFromConfig(sample, "owner@example.com", "any-site-slug"), true);
  });

  it("allows scoped sites admin listed slug only", () => {
    assert.equal(canAdminAccessSiteFromConfig(sample, "editor@example.com", "demo-site"), true);
    assert.equal(canAdminAccessSiteFromConfig(sample, "editor@example.com", "other-site"), false);
  });

  it("denies when sites omitted on admin row", () => {
    assert.equal(canAdminAccessSiteFromConfig(sample, "assistant@example.com", "demo-site"), false);
  });

  it("denies invalid site slug param", () => {
    assert.equal(canAdminAccessSiteFromConfig(sample, "owner@example.com", "../evil"), false);
  });
});

describe("listAdminAllowedOfferingSlugsFromConfig", () => {
  it("returns full ordered list for wildcard", () => {
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(sample, "owner@example.com", ["b-slug", "a-slug"]),
      ["b-slug", "a-slug"]
    );
  });

  it("filters for scoped admin", () => {
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(sample, "editor@example.com", [
        "investing-basics-2026-05",
        "other",
      ]),
      ["investing-basics-2026-05"]
    );
  });

  it("returns empty when not admin", () => {
    assert.deepEqual(listAdminAllowedOfferingSlugsFromConfig(sample, "x@example.com", ["a"]), []);
  });
});

describe("listAdminAllowedSiteSlugsFromConfig", () => {
  it("returns full ordered list for wildcard sites", () => {
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(sample, "owner@example.com", ["z-site", "a-site"]),
      ["z-site", "a-site"]
    );
  });

  it("filters for scoped sites admin", () => {
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(sample, "editor@example.com", ["demo-site", "other"]),
      ["demo-site"]
    );
  });

  it("returns empty when admin has no sites scope", () => {
    assert.deepEqual(listAdminAllowedSiteSlugsFromConfig(sample, "assistant@example.com", ["demo-site"]), []);
  });
});

describe("validateAdminsContent", () => {
  it("accepts minimal valid legacy config", () => {
    const cfg = validateAdminsContent({
      admins: [{ email: "a@example.com", role: "viewer", offerings: ["some-slug"] }],
    });
    assert.equal(cfg.admins.length, 1);
    assert.ok(!cfg.admins[0]!.assignments.some((x) => x.scope.type === "wildcard_sites"));
  });

  it("rejects invalid role (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "superuser", offerings: ["x"] }],
        }),
      /role must be one of/
    );
  });

  it("rejects mixing assignments with legacy keys", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [
            {
              email: "a@example.com",
              role: "owner",
              offerings: ["*"],
              assignments: [{ role: "viewer", scope: { type: "platform" } }],
            },
          ],
        }),
      /not both/
    );
  });

  it("rejects platform scope with slug", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [
            {
              email: "a@example.com",
              assignments: [{ role: "owner", scope: { type: "platform", slug: "nope" } }],
            },
          ],
        }),
      /slug must not be set/
    );
  });

  it("rejects offering assignment without slug", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", assignments: [{ role: "editor", scope: { type: "offering" } }] }],
        }),
      /slug is required.*offering/
    );
  });

  it("rejects unknown scope type in assignments", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [
            {
              email: "a@example.com",
              assignments: [{ role: "editor", scope: { type: "page", slug: "x" } }],
            },
          ],
        } as unknown),
      /must be platform/
    );
  });

  it("rejects empty offerings (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: [] }],
        }),
      /non-empty/
    );
  });

  it("rejects mix of star and slugs in offerings (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "owner", offerings: ["*", "x"] }],
        }),
      /cannot mix/
    );
  });

  it("rejects duplicate emails", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [
            { email: "a@example.com", role: "viewer", offerings: ["x"] },
            { email: "A@example.com", role: "editor", offerings: ["y"] },
          ],
        }),
      /duplicate admin email/
    );
  });

  it("rejects invalid offering slug entry (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["BAD"] }],
        }),
      /valid offering slug/
    );
  });

  it("rejects empty sites when key is set (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: [] }],
        }),
      /sites must be non-empty/
    );
  });

  it("rejects mix of star and slugs in sites (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: ["*", "y"] }],
        }),
      /sites cannot mix/
    );
  });

  it("rejects invalid site slug entry (legacy)", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: ["BAD_SLUG"] }],
        }),
      /valid site slug/
    );
  });
});
