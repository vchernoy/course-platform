import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { it } from "node:test";
import nextConfig from "../next.config";

it("enables Next's real 403 interrupt for authorization denials", () => {
  assert.equal(nextConfig.experimental?.authInterrupts, true);
  // Next compiles authInterrupts into this internal environment flag. Exercise
  // the installed framework implementation, rather than mocking forbidden().
  execFileSync(process.execPath, ["-e", `
    const assert = require('node:assert/strict');
    const { forbidden } = require('next/navigation');
    assert.throws(() => forbidden(), error =>
      error.digest === 'NEXT_HTTP_ERROR_FALLBACK;403');
  `], {
    env: {
      ...process.env,
      __NEXT_EXPERIMENTAL_AUTH_INTERRUPTS: nextConfig.experimental?.authInterrupts ? "1" : "",
    },
  });
});
