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

test("Chalkboard keeps filled primary controls readable (white text on the remapped zinc-900)", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../app/styles.css", import.meta.url), "utf8");
  // zinc-900 is remapped to chalk, so .bg-zinc-900 must also set a dark foreground, normally and on hover.
  assert.match(css, /--color-zinc-900: #f6f8f2/);
  for (const selector of [/\[data-active-style="chalkboard"\] \.bg-zinc-900 \{[^}]*color: #1b2b23/, /\[data-active-style="chalkboard"\] \.hover\\:bg-zinc-800:hover \{[^}]*color: #1b2b23/]) {
    assert.match(css, selector);
  }
});
