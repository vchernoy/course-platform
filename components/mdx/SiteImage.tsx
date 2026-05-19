import { buildSiteAssetHref } from "@/lib/site-assets";

type Props = {
  siteSlug: string;
  src: string;
  alt: string;
  className?: string;
};

export function SiteImage({ siteSlug, src, alt, className }: Props) {
  const href = buildSiteAssetHref(siteSlug, src);
  if (!href) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- site assets are served via site asset API route
    <img
      src={href}
      alt={alt}
      className={
        className ??
        "my-6 h-auto max-w-full rounded-lg border border-zinc-200 shadow-sm"
      }
      loading="lazy"
      decoding="async"
    />
  );
}
