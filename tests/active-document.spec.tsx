import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readActiveDocument } from "../lib/active-document";
import { compileLessonMdxContent, compileLessonMdxContentForHtmlPreview } from "../lib/mdx-lesson-compile";

describe("ActiveDocument", () => {
  it("bounds reads to regular Markdown assets and rejects traversal, URLs, symlinks and oversized files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "active-source-"));
    try {
      const assets = path.join(root, "offerings/demo/assets"); fs.mkdirSync(assets, { recursive: true });
      fs.writeFileSync(path.join(assets, "ok.md"), "safe");
      fs.writeFileSync(path.join(root, "private.md"), "private");
      fs.symlinkSync(path.join(root, "private.md"), path.join(assets, "link.md"));
      fs.writeFileSync(path.join(assets, "huge.md"), "x".repeat(65537));
      expect(readActiveDocument("demo", "../assets/ok.md", root)).toBe("safe");
      for (const source of ["https://example.com/a.md", "/etc/passwd.md", "../assets/../../private.md", "../assets/link.md", "../assets/huge.md", "../assets/missing.md", "../assets/ok.mdx", "../assets/%2e%2e/private.md"]) {
        expect(() => readActiveDocument("demo", source, root)).toThrow();
      }
      expect(() => readActiveDocument("../demo", "../assets/ok.md", root)).toThrow();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  it("compiles literal source attributes under blockJS and renders identical sanitized defaults in preview", async () => {
    const params = { offeringSlug: "investing-basics-2026-05", source: '<ActiveDocument source="../assets/compound-interest.md" />', videos: {}, resources: {} };
    const lesson = renderToStaticMarkup(await compileLessonMdxContent(params));
    const preview = renderToStaticMarkup(await compileLessonMdxContentForHtmlPreview(params));
    for (const html of [lesson, preview]) {
      expect(html).toContain("Deposit (starts at 10,000.00)");
      expect(html).toContain("21,589.25");
      expect(html).toContain('class="katex');
      expect(html).not.toContain('role="alert"');
    }
    expect(preview).toContain("Static defaults preview");
    const bad = renderToStaticMarkup(await compileLessonMdxContent({ ...params, source: '<ActiveDocument source="../../config/students.yaml" />' }));
    expect(bad).toContain('role="alert"'); expect(bad).not.toContain("@example.com");
  });
});
