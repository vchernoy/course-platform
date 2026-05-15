import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logDevWarning, logProdDiagnostic } from "../lib/logger";

describe("logger", () => {
  it("logProdDiagnostic does not throw", () => {
    assert.doesNotThrow(() => logProdDiagnostic("scope", "code_ok"));
  });

  it("logDevWarning does not throw", () => {
    assert.doesNotThrow(() => logDevWarning("scope", "detail"));
  });
});
