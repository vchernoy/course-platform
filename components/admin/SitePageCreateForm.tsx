"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSitePageAction } from "@/lib/admin-site-page-actions";

type Props = {
  siteSlug: string;
  disabled: boolean;
  disabledReason?: string | null;
};

export function SitePageCreateForm({ siteSlug, disabled, disabledReason }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [addToNavigation, setAddToNavigation] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setSlug("");
    setAddToNavigation(true);
  }

  function submit() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await createSitePageAction(siteSlug, {
          title,
          slug,
          addToNavigation,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        resetForm();
        router.refresh();
      })();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Create page</h3>
      {disabled && disabledReason ? (
        <p className="mt-2 text-sm text-zinc-600">{disabledReason}</p>
      ) : null}
      <div className="mt-3 space-y-3">
        <label className="block text-xs font-medium text-zinc-700">
          Title
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled || pending}
            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 disabled:bg-zinc-50"
            placeholder="Page title"
            autoComplete="off"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-700">
          Slug (URL segment)
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={disabled || pending}
            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm font-mono text-zinc-900 disabled:bg-zinc-50"
            placeholder="about"
            autoComplete="off"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-800">
          <input
            type="checkbox"
            checked={addToNavigation}
            onChange={(e) => setAddToNavigation(e.target.checked)}
            disabled={disabled || pending}
          />
          Add to navigation (site.yaml)
        </label>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={() => submit()}
          disabled={disabled || pending}
          className="rounded bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create published page"}
        </button>
      </div>
    </div>
  );
}
