import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdminAccessOfferingFromConfig,
  emailIsAdminFromConfig,
  getAdminAccessFromConfig,
  listAdminAllowedOfferingSlugsFromConfig,
  validateAdminsContent,
} from "../lib/admins";
import type { AdminsConfig } from "../lib/admins";

const sample: AdminsConfig = validateAdminsContent({
  admins: [
    { email: "owner@example.com", role: "owner", offerings: ["*"] },
    {
      email: "Editor@example.com",
      role: "editor",
      offerings: ["investing-basics-2026-05", "investing-basics-2026-05"],
    },
    { email: "assistant@example.com", role: "viewer", offerings: ["roth-ira-webinar-2026-04"] },
  ],
});

describe("getAdminAccessFromConfig", () => {
  it("resolves owner with wildcard", () => {
    const a = getAdminAccessFromConfig(sample, "owner@example.com");
    assert.deepEqual(a, { role: "owner", allOfferings: true, offeringSlugs: [] });
  });

  it("dedupes explicit offering slugs", () => {
    const a = getAdminAccessFromConfig(sample, "editor@example.com");
    assert.deepEqual(a, {
      role: "editor",
      allOfferings: false,
      offeringSlugs: ["investing-basics-2026-05"],
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

describe("validateAdminsContent", () => {
  it("accepts minimal valid config", () => {
    const cfg = validateAdminsContent({
      admins: [{ email: "a@example.com", role: "viewer", offerings: ["some-slug"] }],
    });
    assert.equal(cfg.admins.length, 1);
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

  it("rejects mix of star and slugs", () => {
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
});
