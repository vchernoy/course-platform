import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readActiveDocument } from "../lib/active-document";
import { compileLessonMdxContent, compileLessonMdxContentForHtmlPreview } from "../lib/mdx-lesson-compile";

describe("ActiveDocument", () => {
  it("supports bounded fenced ActiveMD inside MDX while preserving components and ordinary calc examples", async () => {
    const active = '```calc\ninput x = 2\ny = x * 3\n```\n\n:edit{input=x}\n\n:value[y]\n\n$$y={{y}}$$';
    const source = '<Details title="MDX">Normal component</Details>\n\n````active-md\n' + active + '\n````\n\n```calc\nexample = 123\n```';
    for (const compile of [compileLessonMdxContent, compileLessonMdxContentForHtmlPreview]) {
      const html = renderToStaticMarkup(await compile({ offeringSlug: "investing-basics-2026-05", source, videos: {}, resources: {} }));
      expect(html).toContain("Normal component");
      expect(html).toContain('data-active-input="x"');
      expect(html).toContain('>6</output>');
      expect(html).toContain('class="katex');
      expect(html).toContain('language-calc');
      expect(html).toContain('example = 123');
    }
  });
  it("sanitizes inline source and reports failures without enabling MDX JavaScript", async () => {
    const compile = async (body: string) => renderToStaticMarkup(await compileLessonMdxContentForHtmlPreview({
      offeringSlug: "investing-basics-2026-05", source: '````active-md\n' + body + '\n````', videos: {}, resources: {},
    }));
    const html = await compile('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nHello');
    expect(html).toContain('Hello'); expect(html).not.toContain('<script'); expect(html).not.toContain('<img');
    expect(await compile('```calc\ny = missing\n```\n\n:value[y]')).toContain('role="alert"');
    expect(await compile('x'.repeat(65537))).toContain('at most 64 KiB');
    const outside = renderToStaticMarkup(await compileLessonMdxContentForHtmlPreview({offeringSlug:"investing-basics-2026-05",source:'{1 + 2}',videos:{},resources:{}}));
    expect(outside).not.toContain('>3<');
  });
  it("bounds reads to regular Markdown assets and rejects traversal, URLs, symlinks and oversized files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "active-source-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
    try {
      const assets = path.join(root, "content/offerings/demo/assets");
      fs.mkdirSync(path.dirname(assets), { recursive: true });
      fs.writeFileSync(path.join(path.dirname(assets), "offering.yaml"), "title: Demo\n"); fs.mkdirSync(assets, { recursive: true });
      fs.writeFileSync(path.join(assets, "ok.md"), "safe");
      fs.writeFileSync(path.join(root, "private.md"), "private");
      fs.symlinkSync(path.join(root, "private.md"), path.join(assets, "link.md"));
      fs.writeFileSync(path.join(assets, "huge.md"), "x".repeat(65537));
      expect(readActiveDocument("demo", "../assets/ok.md")).toBe("safe");
      for (const source of ["https://example.com/a.md", "/etc/passwd.md", "../assets/../../private.md", "../assets/link.md", "../assets/huge.md", "../assets/missing.md", "../assets/ok.mdx", "../assets/%2e%2e/private.md"]) {
        expect(() => readActiveDocument("demo", source)).toThrow();
      }
      expect(() => readActiveDocument("../demo", "../assets/ok.md")).toThrow();
    } finally { cwd.mockRestore(); fs.rmSync(root, { recursive: true, force: true }); }
  });
  it("resolves registered external offerings without falling back to unconfigured local content", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "active-external-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(project);
    const write = (file: string, value: string) => {
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value);
    };
    try {
      write(path.join(project, "config/sources.yaml"), "customers:\n  - id: demo\n    sources:\n      - dir: remote\n");
      write(path.join(project, "remote/content/offerings/external/offering.yaml"), "title: External\n");
      write(path.join(project, "remote/content/offerings/external/assets/calc.md"), "External calculator");
      expect(readActiveDocument("external", "../assets/calc.md")).toBe("External calculator");
      write(path.join(project, "content/offerings/hidden/offering.yaml"), "title: Hidden\n");
      write(path.join(project, "content/offerings/hidden/assets/calc.md"), "Not registered");
      expect(() => readActiveDocument("hidden", "../assets/calc.md")).toThrow("not registered");
      fs.symlinkSync(path.join(project, "content/offerings/hidden/assets/calc.md"), path.join(project, "remote/content/offerings/external/assets/leak.md"));
      expect(() => readActiveDocument("external", "../assets/leak.md")).toThrow();
    } finally { cwd.mockRestore(); fs.rmSync(project, { recursive: true, force: true }); }
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
    expect(preview).toContain("Interactive document preview");
    const bad = renderToStaticMarkup(await compileLessonMdxContent({ ...params, source: '<ActiveDocument source="../../config/students.yaml" />' }));
    expect(bad).toContain('role="alert"'); expect(bad).not.toContain("@example.com");
  });
});
