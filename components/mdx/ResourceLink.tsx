import type { ReactNode } from "react";
import type { OfferingResourceMap } from "@/lib/offering-resources";
import { localOfferingAssetHref } from "@/lib/offering-resources";
import { safeAssetFilePath } from "@/lib/offering-assets";

export type ResourceLinkMdxProps = { assetId: string };

function amberBox(children: ReactNode) {
  return (
    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      {children}
    </div>
  );
}

/**
 * MDX link block resolved from `resources.yaml` (mirrors {@link createLessonVideoPlayer}).
 */
export function createOfferingResourceLink(
  resources: OfferingResourceMap,
  offeringSlug: string
) {
  return function ResourceLinkMdx(props: ResourceLinkMdxProps) {
    const raw = (props as { assetId?: unknown }).assetId;
    const assetId = typeof raw === "string" ? raw.trim() : "";

    if (!assetId) {
      return amberBox(
        <>
          <code className="font-mono">ResourceLink</code> needs a non-empty{" "}
          <code className="font-mono">assetId</code>.
        </>
      );
    }

    const row = resources[assetId];
    if (!row) {
      return amberBox(
        <>
          Unknown resource <code className="font-mono">{assetId}</code>. Add{" "}
          <code className="font-mono">resources.{assetId}</code> in{" "}
          <code className="font-mono">content/offerings/&lt;slug&gt;/resources.yaml</code>.
        </>
      );
    }

    if (row.type === "external") {
      return (
        <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-4">
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-[3px] hover:text-blue-800"
          >
            {row.label}
          </a>
          {row.warning ? (
            <p className="mt-2 text-xs text-amber-900">{row.warning}</p>
          ) : null}
        </div>
      );
    }

    const href = localOfferingAssetHref(offeringSlug, row.pathSegments);
    const onDisk = safeAssetFilePath(offeringSlug, row.pathSegments);

    if (!onDisk) {
      return amberBox(
        <>
          Local resource <code className="font-mono">{assetId}</code> points to{" "}
          <code className="font-mono">{row.pathSegments.join("/")}</code>, but that file is missing under{" "}
          <code className="font-mono">content/offerings/{offeringSlug}/assets/</code>.
        </>
      );
    }

    return (
      <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-4">
        <a
          href={href}
          className="text-sm font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-[3px] hover:text-blue-800"
        >
          {row.label}
        </a>
      </div>
    );
  };
}
