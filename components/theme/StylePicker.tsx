"use client";

import { useId, useSyncExternalStore } from "react";
import { applyStyle, STYLE_KEY, STYLES, styleChoice, type StyleId } from "@/lib/styles";

const CHANGE_EVENT = "course-platform-style";

// The boot script applies the saved style before hydration; the attribute on <html> is the source of truth.
function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
const current = (): StyleId => styleChoice(document.documentElement.dataset.activeStyle);
const onServer = (): StyleId => "plain";

type Props = {
  className?: string;
};

/** Style list for the whole platform; saved in this browser only, nothing is sent. */
export function StylePicker({ className }: Props) {
  const id = useId();
  const style = useSyncExternalStore(subscribe, current, onServer);

  function choose(value: StyleId): void {
    applyStyle(document.documentElement, value);
    try {
      if (value === "plain") localStorage.removeItem(STYLE_KEY);
      else localStorage.setItem(STYLE_KEY, value);
    } catch {
      /* Storage blocked: the choice still applies until the page reloads. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2 text-sm text-zinc-600 ${className ?? ""}`}>
      Style
      <select
        id={id}
        value={style}
        onChange={(event) => choose(styleChoice(event.target.value))}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
      >
        {STYLES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
