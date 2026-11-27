import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { STYLE_BOOT_SCRIPT, STYLE_KEY, STYLES, styleChoice } from "../lib/styles";

test("the style list matches ActiveMD's ids; unknown or corrupt values are plain", () => {
  assert.deepEqual(STYLES.map((style) => style.id), ["plain", "sketch", "brutal", "notebook", "chalkboard"]);
  for (const style of STYLES) assert.equal(styleChoice(style.id), style.id);
  for (const value of [null, undefined, "", "Sketch", "url(x)", 1, {}]) assert.equal(styleChoice(value), "plain");
});

function boot(saved: string | null | Error): Record<string, string> {
  const dataset: Record<string, string> = {};
  runInNewContext(STYLE_BOOT_SCRIPT, {
    localStorage: {
      getItem: (key: string) => {
        if (saved instanceof Error) throw saved;
        return key === STYLE_KEY ? saved : null;
      },
    },
    document: { documentElement: { dataset } },
  });
  return dataset;
}

test("the boot script applies only a known saved style and survives blocked storage", () => {
  assert.equal(boot("notebook").activeStyle, "notebook");
  for (const saved of [null, "plain", "unknown", "\"><script>"]) assert.equal(boot(saved).activeStyle, undefined);
  assert.equal(boot(new Error("blocked")).activeStyle, undefined);
});
