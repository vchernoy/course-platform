import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import "./styles.css";
import { STYLE_BOOT_SCRIPT } from "@/lib/styles";

export const metadata: Metadata = {
  title: "Course platform",
  description: "Local-file LMS prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      {/* The boot script sets data-active-style before React hydrates, so the attribute may differ. */}
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT_SCRIPT }} />
        </head>
        <body className="min-h-screen bg-zinc-50 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
