import assert from "node:assert/strict";
import { describe, it } from "node:test";
import yaml from "yaml";
import fs from "node:fs";
import path from "node:path";
import { sourceRootDir, validateSourcesContent } from "../lib/sources";

const parse = (text: string) => validateSourcesContent(yaml.parse(text));

describe("validateSourcesContent", () => {
  it("accepts the repository's own config/sources.yaml", () => {
    const raw = yaml.parse(fs.readFileSync(path.join(process.cwd(), "config/sources.yaml"), "utf8"));
    const cfg = validateSourcesContent(raw);
    assert.ok(cfg.customers.length >= 1);
  });

  it("parses self, github and dir sources with defaults", () => {
    const cfg = parse(`customers:
  - id: me
    sources:
      - self: true
      - repo: Owner/Private.Repo
        tokenEnv: GITHUB_TOKEN_ME
        ref: main
        path: sub/dir
      - dir: ../local-course
`);
    assert.deepEqual(cfg.customers[0]!.sources, [
      { id: "self", type: "self" },
      { id: "owner-private-repo", type: "github", repo: "Owner/Private.Repo", ref: "main", path: "sub/dir", tokenEnv: "GITHUB_TOKEN_ME" },
      { id: "local-course", type: "dir", dir: "../local-course" },
    ]);
  });

  it("computes where each source lives", () => {
    assert.equal(sourceRootDir("/app", "me", { id: "self", type: "self" }), "/app");
    assert.equal(
      sourceRootDir("/app", "me", { id: "x", type: "github", repo: "a/b", path: "p" }),
      "/app/external-content/me/x/p"
    );
    assert.equal(sourceRootDir("/app", "me", { id: "d", type: "dir", dir: "../d" }), "/d");
  });

  it("parses bunnyLibraries (numbers or strings)", () => {
    const cfg = parse("customers:\n  - id: a\n    bunnyLibraries: [123456, \"654321\"]\n    sources: [{dir: x}]\n");
    assert.deepEqual(cfg.customers[0]!.bunnyLibraries, ["123456", "654321"]);
  });

  const bad: Array<[string, string, RegExp]> = [
    ["no customers", "customers: []", /non-empty list/],
    ["bad customer id", "customers:\n  - id: Me!\n    sources: [{self: true}]", /customers\[0\]\.id/],
    ["duplicate customer", "customers:\n  - {id: a, sources: [{dir: x}]}\n  - {id: a, sources: [{dir: y}]}", /duplicate customer/],
    ["no sources", "customers:\n  - {id: a, sources: []}", /sources must be a non-empty list/],
    ["unknown source kind", "customers:\n  - {id: a, sources: [{foo: 1}]}", /needs one of/],
    ["bad repo", "customers:\n  - {id: a, sources: [{repo: not-a-repo}]}", /owner\/name/],
    ["token pasted instead of env name", "customers:\n  - {id: a, sources: [{repo: a/b, tokenEnv: github_pat_123}]}", /environment variable NAME/],
    ["path escapes source", "customers:\n  - {id: a, sources: [{repo: a/b, path: ../x}]}", /relative path inside/],
    ["duplicate source id", "customers:\n  - {id: a, sources: [{dir: x/c}, {dir: y/c}]}", /duplicate source id "c"/],
    ["bunnyLibraries not a list", "customers:\n  - {id: a, bunnyLibraries: 123, sources: [{dir: x}]}", /bunnyLibraries must be a list/],
    ["non-numeric bunny library", "customers:\n  - {id: a, bunnyLibraries: [abc], sources: [{dir: x}]}", /numeric Bunny library id/],
    ["bunny library owned twice", "customers:\n  - {id: a, bunnyLibraries: [1], sources: [{dir: x}]}\n  - {id: b, bunnyLibraries: [1], sources: [{dir: y}]}", /belongs to one customer/],
    ["self owned twice", "customers:\n  - {id: a, sources: [{self: true}]}\n  - {id: b, sources: [{self: true}]}", /only one customer/],
  ];
  for (const [name, text, re] of bad) {
    it(`rejects: ${name}`, () => assert.throws(() => parse(text), re));
  }
});
