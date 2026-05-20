"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSitePageAction } from "@/lib/admin-site-page-actions";

type Props = {
  siteSlug: string;
  pageSlug: string;
  pageLabel: string;
  disabled: boolean;
  disabledReason?: string | null;
};

export function SitePageDeleteButton({
  siteSlug,
  pageSlug,
  pageLabel,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    if (
      !window.confirm(
        `Delete published page "${pageLabel}" (${pageSlug}.mdx)? This cannot be undone. Draft files are not removed.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await deleteSitePageAction(siteSlug, pageSlug);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      })();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => confirmDelete()}
        disabled={disabled || pending}
        className="text-xs font-medium text-red-700 underline-offset-2 hover:text-red-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete page"}
      </button>
      {disabled && disabledReason ? (
        <span className="max-w-[12rem] text-right text-[10px] text-zinc-500">{disabledReason}</span>
      ) : null}
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </span>
  );
}
