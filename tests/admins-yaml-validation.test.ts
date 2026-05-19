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

describe("getAdminAccessFromConfig", () => {
  it("resolves owner with wildcard offerings and sites", () => {
    const a = getAdminAccessFromConfig(sample, "owner@example.com");
    assert.deepEqual(a, {
      role: "owner",
      allOfferings: true,
      offeringSlugs: [],
      allSites: true,
      siteSlugs: [],
    });
  });

  it("dedupes explicit offering slugs", () => {
    const a = getAdminAccessFromConfig(sample, "editor@example.com");
    assert.deepEqual(a, {
      role: "editor",
      allOfferings: false,
      offeringSlugs: ["investing-basics-2026-05"],
      allSites: false,
      siteSlugs: ["demo-site"],
    });
  });

  it("omitted sites means no site scope", () => {
    const a = getAdminAccessFromConfig(sample, "assistant@example.com");
    assert.deepEqual(a, {
      role: "viewer",
      allOfferings: false,
      offeringSlugs: ["roth-ira-webinar-2026-04"],
      allSites: false,
      siteSlugs: [],
    });
  });

  it("returns null for unknown email", () => {
    assert.equal(getAdminAccessFromConfig(sample, "nobody@example.com"), null);
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
      listAdminAllowedOfferingSlugsFromConfig(sample, "owner@example.com", [
        "b-slug",
        "a-slug",
      ]),
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
    assert.deepEqual(
      listAdminAllowedOfferingSlugsFromConfig(sample, "x@example.com", ["a"]),
      []
    );
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
    assert.deepEqual(
      listAdminAllowedSiteSlugsFromConfig(sample, "assistant@example.com", ["demo-site"]),
      []
    );
  });
});

describe("validateAdminsContent", () => {
  it("accepts minimal valid config", () => {
    const cfg = validateAdminsContent({
      admins: [{ email: "a@example.com", role: "viewer", offerings: ["some-slug"] }],
    });
    assert.equal(cfg.admins.length, 1);
    assert.equal(cfg.admins[0]!.allSites, false);
    assert.deepEqual(cfg.admins[0]!.siteSlugs, []);
  });

  it("rejects invalid role", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "superuser", offerings: ["x"] }],
        }),
      /role must be one of/
    );
  });

  it("rejects empty offerings", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: [] }],
        }),
      /non-empty/
    );
  });

  it("rejects mix of star and slugs in offerings", () => {
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

  it("rejects invalid offering slug entry", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["BAD"] }],
        }),
      /valid offering slug/
    );
  });

  it("rejects empty sites when key is set", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: [] }],
        }),
      /sites must be non-empty/
    );
  });

  it("rejects mix of star and slugs in sites", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: ["*", "y"] }],
        }),
      /sites cannot mix/
    );
  });

  it("rejects invalid site slug entry", () => {
    assert.throws(
      () =>
        validateAdminsContent({
          admins: [{ email: "a@example.com", role: "viewer", offerings: ["x"], sites: ["BAD_SLUG"] }],
        }),
      /valid site slug/
    );
  });
});
