"use client";

import { useEffect, useRef } from "react";
import { mount } from "@vchernoy/active-runtime";

/** Receives only HTML sanitized by renderActive on the server. */
export function ActiveDocumentClient({ html }: { html: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.innerHTML = html;
    const mounted = mount(element, { locale: "en-US" });
    return () => {
      mounted.destroy();
      element.innerHTML = html;
    };
  }, [html]);
  return <div className="active-document" ref={root} dangerouslySetInnerHTML={{ __html: html }} />;
}
