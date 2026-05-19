"use client";

import { previewLessonMdxAction } from "@/lib/admin-preview-lesson-action";
import { previewSiteMdxAction } from "@/lib/admin-preview-site-action";
import { discardLessonDraftAction, saveLessonDraftAction } from "@/lib/draft-lesson-actions";
import { discardSitePageDraftAction, saveSitePageDraftAction } from "@/lib/draft-site-actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type AdminMdxPreviewResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

export type AdminMdxDraftEditorProps =
  | {
      variant: "lesson";
      offeringSlug: string;
      lessonSlug: string;
      initialSource: string;
      initialPreview: AdminMdxPreviewResult;
      previewLabel?: string;
      sourceHeading?: string;
      helpText: string;
    }
  | {
      variant: "site";
      siteSlug: string;
      pageSlug: string;
      initialSource: string;
      initialPreview: AdminMdxPreviewResult;
      previewLabel?: string;
      sourceHeading?: string;
      helpText: string;
    };

export function AdminMdxDraftEditor(props: AdminMdxDraftEditorProps) {
  const {
    initialSource,
    initialPreview,
    previewLabel = "Preview",
    sourceHeading = "MDX source",
    helpText,
  } = props;

  const router = useRouter();
  const [mdx, setMdx] = useState(initialSource);
  const [preview, setPreview] = useState<AdminMdxPreviewResult>(initialPreview);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"ok" | "err">("ok");
  const [pending, startTransition] = useTransition();

  function runPreview() {
    setNotice(null);
    startTransition(() => {
      const promise =
        props.variant === "lesson"
          ? previewLessonMdxAction(props.offeringSlug, props.lessonSlug, mdx)
          : previewSiteMdxAction(props.siteSlug, props.pageSlug, mdx);
      void promise.then(setPreview);
    });
  }

  function runSave() {
    setNotice(null);
    startTransition(() => {
      const promise =
        props.variant === "lesson"
          ? saveLessonDraftAction(props.offeringSlug, props.lessonSlug, mdx)
          : saveSitePageDraftAction(props.siteSlug, props.pageSlug, mdx);
      void promise.then((r) => {
        if (!r.ok) {
          setNoticeTone("err");
          setNotice(r.error);
          return;
        }
        setNoticeTone("ok");
        setNotice("Draft saved locally under .data/drafts (not published).");
        router.refresh();
      });
    });
  }

  function runDiscard() {
    if (!window.confirm("Discard your local draft for this page? Published content is unchanged.")) {
      return;
    }
    setNotice(null);
    startTransition(() => {
      const promise =
        props.variant === "lesson"
          ? discardLessonDraftAction(props.offeringSlug, props.lessonSlug)
          : discardSitePageDraftAction(props.siteSlug, props.pageSlug);
      void promise.then((r) => {
        if (!r.ok) {
          setNoticeTone("err");
          setNotice(r.error);
          return;
        }
        setNoticeTone("ok");
        setNotice("Draft discarded. Showing published source.");
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-8">
      {notice ? (
        <div
          role="status"
          className={
            noticeTone === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
              : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          }
        >
          {notice}
        </div>
      ) : null}

      <section aria-labelledby="mdx-source-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mdx-source-heading" className="text-lg font-semibold text-zinc-900">
            {sourceHeading}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runDiscard}
              disabled={pending}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              Discard draft
            </button>
            <button
              type="button"
              onClick={runSave}
              disabled={pending}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={runPreview}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {pending ? "Working…" : previewLabel}
            </button>
          </div>
        </div>
        <textarea
          name="mdx"
          value={mdx}
          onChange={(e) => setMdx(e.target.value)}
          spellCheck={false}
          className="mt-3 min-h-[220px] w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30"
          aria-label="MDX source editor"
        />
        <p className="mt-2 text-xs text-zinc-500">{helpText}</p>
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
