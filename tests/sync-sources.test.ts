import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const repoRoot = process.cwd();
const tsx = path.join(repoRoot, "node_modules", ".bin", "tsx");
const script = path.join(repoRoot, "scripts", "sync-sources.ts");

let project: string;

function run(env: Record<string, string | undefined> = {}) {
  const clean = { ...process.env };
  for (const k of ["VERCEL", "SOURCES_STRICT", "TEST_SYNC_TOKEN"]) delete clean[k];
  return spawnSync(tsx, [script], {
    cwd: project,
    encoding: "utf8",
    env: { ...clean, NODE_ENV: "production", ...env },
  });
}

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), "sync-sources-"));
  fs.mkdirSync(path.join(project, "config"));
  // A private source whose token variable is not set: no network is needed to hit the error.
  fs.writeFileSync(
    path.join(project, "config/sources.yaml"),
    "customers:\n  - id: me\n    sources:\n      - repo: example/private-content\n        tokenEnv: TEST_SYNC_TOKEN\n"
  );
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

describe("scripts/sync-sources.ts", () => {
  it("skips an unusable source when not strict", () => {
    const r = run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /skipping me\/example-private-content: environment variable TEST_SYNC_TOKEN/);
  });

  it("fails when SOURCES_STRICT is set in the environment", () => {
    const r = run({ SOURCES_STRICT: "1" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /stopping the build/);
  });

  it("reads SOURCES_STRICT from .env.local, like next build", () => {
    fs.writeFileSync(path.join(project, ".env.local"), "SOURCES_STRICT=1\n");
    const r = run();
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /stopping the build/);
  });

  it("reads SOURCES_STRICT from .env.production for self-hosted builds", () => {
    fs.writeFileSync(path.join(project, ".env.production"), "SOURCES_STRICT=1\n");
    const r = run();
    assert.equal(r.status, 1, r.stdout + r.stderr);
  });
});
