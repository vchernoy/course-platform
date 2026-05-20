import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE,
  draftSaveStoragePhrase,
  isVercelDeployment,
  localPublishDisabledReason,
  resolveDraftBackend,
  vercelFilesystemDraftMutationBlockedReason,
} from "../lib/drafts/deployment-policy";

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

describe("deployment-policy", () => {
  it("resolveDraftBackend defaults to local when unset", async () => {
    await withEnv({ DRAFT_BACKEND: undefined }, () => {
      assert.equal(resolveDraftBackend(), "local");
    });
  });

  it("resolveDraftBackend accepts blob", async () => {
    await withEnv({ DRAFT_BACKEND: "blob" }, () => {
      assert.equal(resolveDraftBackend(), "blob");
    });
  });

  it("resolveDraftBackend rejects unknown values", async () => {
    await withEnv({ DRAFT_BACKEND: "redis" }, () => {
      assert.throws(() => resolveDraftBackend(), /Invalid DRAFT_BACKEND/);
    });
  });

  it("localPublishDisabledReason on Vercel matches publish guard message", async () => {
    await withEnv({ VERCEL: "1" }, () => {
      assert.equal(localPublishDisabledReason(), LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE);
      assert.equal(isVercelDeployment(), true);
    });
  });

  it("localPublishDisabledReason off Vercel is null", async () => {
    await withEnv({ VERCEL: undefined }, () => {
      assert.equal(localPublishDisabledReason(), null);
      assert.equal(isVercelDeployment(), false);
    });
  });

  it("vercelFilesystemDraftMutationBlockedReason when VERCEL and local backend", async () => {
    await withEnv({ VERCEL: "1", DRAFT_BACKEND: "local" }, () => {
      const msg = vercelFilesystemDraftMutationBlockedReason();
      assert.ok(msg);
      assert.match(msg!, /DRAFT_BACKEND=blob/);
    });
  });

  it("vercelFilesystemDraftMutationBlockedReason clears when blob backend", async () => {
    await withEnv({ VERCEL: "1", DRAFT_BACKEND: "blob" }, () => {
      assert.equal(vercelFilesystemDraftMutationBlockedReason(), null);
    });
  });

  it("draftSaveStoragePhrase mentions blob storage when configured", async () => {
    await withEnv({ DRAFT_BACKEND: "blob" }, () => {
      assert.match(draftSaveStoragePhrase(), /blob/i);
    });
    await withEnv({ DRAFT_BACKEND: undefined }, () => {
      assert.match(draftSaveStoragePhrase(), /\.data\/drafts/);
    });
  });
});
