type Props = {
  courseSlug: string;
  src: string;
  alt: string;
  className?: string;
};

function resolvedSrc(courseSlug: string, src: string): string {
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;

  const encoded = s
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  return `/api/offering-assets/${courseSlug}/${encoded}`;
}

export function CourseImage({ courseSlug, src, alt, className }: Props) {
  const href = resolvedSrc(courseSlug, src);
  if (!href) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- lesson assets are served via course API route
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
