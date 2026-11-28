import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Lesson math is rendered by rehype-katex, while app/layout.tsx loads the top-level katex CSS (also
 * used by ActiveMD). If rehype-katex resolves its own older katex, its markup doesn't match the CSS
 * and superscripts/subscripts render oversized. package.json "overrides" keeps a single copy.
 */
describe("katex", () => {
  it("rehype-katex uses the same katex as the app's stylesheet", () => {
    const root = process.cwd();
    const fromRoot = createRequire(path.join(root, "package.json"));
    const appKatex = fromRoot.resolve("katex");
    // Resolve "katex" the way rehype-katex's own files do (its package.json isn't exported).
    const rehypeDir = path.join(root, "node_modules", "rehype-katex");
    assert.ok(fs.existsSync(rehypeDir), "rehype-katex is installed");
    const rehypeKatex = createRequire(path.join(rehypeDir, "index.js")).resolve("katex");
    assert.equal(rehypeKatex, appKatex, `rehype-katex resolves ${rehypeKatex}, the app uses ${appKatex}`);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "node_modules", "katex", "package.json"), "utf8"));
    assert.equal(pkg.version, "0.19.1");
  });
});
