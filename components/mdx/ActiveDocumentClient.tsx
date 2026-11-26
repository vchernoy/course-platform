"use client";

import { useEffect, useRef } from "react";
import { mount } from "@vchernoy/active-runtime";

/** Server-rendered HTML; activate only the nested sanitized ActiveMD roots. */
export function ActiveDocumentClient({ html, className = "active-document" }: { html: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.innerHTML = html;
    const mounted = [...element.querySelectorAll<HTMLElement>(".active-doc")]
      .map(document => mount(document, { locale: "en-US" }));
    return () => {
      mounted.forEach(document => document.destroy());
      element.innerHTML = html;
    };
  }, [html]);
  return <div className={className} ref={root} dangerouslySetInnerHTML={{ __html: html }} />;
}
