"use client";

import { useState, useTransition } from "react";
import { previewLessonMdxAction } from "@/lib/admin-preview-lesson-action";

export type LessonMdxPreviewResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

type Props = {
  offeringSlug: string;
  lessonSlug: string;
  initialSource: string;
  initialPreview: LessonMdxPreviewResult;
};

export function LessonMdxPreviewForm({
  offeringSlug,
  lessonSlug,
  initialSource,
  initialPreview,
}: Props) {
  const [mdx, setMdx] = useState(initialSource);
  const [preview, setPreview] = useState<LessonMdxPreviewResult>(initialPreview);
  const [pending, startTransition] = useTransition();

  function runPreview() {
    startTransition(() => {
      void previewLessonMdxAction(offeringSlug, lessonSlug, mdx).then(setPreview);
    });
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="mdx-source-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mdx-source-heading" className="text-lg font-semibold text-zinc-900">
            MDX source
          </h2>
          <button
            type="button"
            onClick={runPreview}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Rendering…" : "Preview"}
          </button>
        </div>
        <textarea
          name="mdx"
          value={mdx}
          onChange={(e) => setMdx(e.target.value)}
          spellCheck={false}
          className="mt-3 min-h-[220px] w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30"
          aria-label="Lesson MDX source"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Unsaved draft — nothing is written to disk or Git. Preview uses a temporary HTML
          serialization; interactive lesson blocks may not behave like the live lesson page (
          <span className="font-medium text-zinc-700">see docs/admin-authoring.md</span>).
        </p>
      </section>

      <section aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="text-lg font-semibold text-zinc-900">
          Rendered preview
        </h2>
        {!preview.ok ? (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            {preview.error}
          </div>
        ) : (
          <div
            className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        )}
      </section>
    </div>
  );
}
