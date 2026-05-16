"use client";

import { useCallback, useId, useMemo, useState } from "react";

type Props = {
  question: string;
  /** Plain array or JSON array string (required for MDX: next-mdx-remote strips `{expression}` props). */
  choices: string[] | string;
  answer: number | string;
  explanation?: string;
};

function parseChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((c): c is string => typeof c === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((c) => (typeof c === "string" ? c.trim() : c != null ? String(c).trim() : ""))
        .filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function parseAnswer(raw: unknown, choiceCount: number): number {
  let n: number;
  if (typeof raw === "number" && Number.isInteger(raw)) {
    n = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed)) return -1;
    n = parsed;
  } else {
    return -1;
  }
  if (n < 0 || n >= choiceCount) return -1;
  return n;
}

export function Quiz({ question, choices, answer, explanation }: Props) {
  const [picked, setPicked] = useState<number | null>(null);

  const safeChoices = useMemo(() => parseChoices(choices), [choices]);

  const correctIndex = useMemo(
    () => parseAnswer(answer, safeChoices.length),
    [answer, safeChoices.length]
  );

  const revealed = picked !== null && correctIndex >= 0;
  const isCorrect = revealed && picked === correctIndex;

  const pick = useCallback(
    (index: number) => {
      if (correctIndex < 0 || picked !== null) return;
      setPicked(index);
    },
    [correctIndex, picked]
  );

  const tryAgain = useCallback(() => {
    setPicked(null);
  }, []);

  if (safeChoices.length === 0 || correctIndex < 0) {
    return (
      <div
        className="my-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        Quiz could not load: use a JSON array string for{" "}
        <code className="font-mono text-xs">choices</code> (MDX cannot pass{" "}
        <code className="font-mono text-xs">{"{[...]}"}</code> props) and a valid{" "}
        <code className="font-mono text-xs">answer</code> index (
        <code className="font-mono text-xs">0</code>
        -based).
      </div>
    );
  }

  const baseId = useId();
  const legendId = `${baseId}-legend`;

  return (
    <fieldset
      className="my-6 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
      aria-labelledby={legendId}
    >
      <legend id={legendId} className="sr-only">
        Quiz question
      </legend>
      <p className="text-base font-semibold leading-snug text-zinc-900">{question}</p>

      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Answer choices">
        {safeChoices.map((label, index) => {
          const isSel = picked === index;
          const isAnswer = index === correctIndex;
          let btn =
            "w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ";

          if (!revealed) {
            btn +=
              "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white";
          } else if (isAnswer) {
            btn += "border-emerald-400 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400";
          } else if (isSel) {
            btn += "border-red-300 bg-red-50 text-red-950 ring-1 ring-red-300";
          } else {
            btn += "border-zinc-100 bg-zinc-50/80 text-zinc-500";
          }

          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={isSel}
              disabled={revealed}
              className={btn}
              onClick={() => pick(index)}
            >
              <span className="mr-2 font-mono text-xs text-zinc-400">{index + 1}.</span>
              {label}
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className="mt-4 space-y-3">
          <p
            className={`text-sm font-semibold ${isCorrect ? "text-emerald-800" : "text-red-800"}`}
            role="status"
          >
            {isCorrect ? "Correct." : "Incorrect."}
          </p>
          {explanation?.trim() ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700">
              {explanation.trim()}
            </div>
          ) : null}
          <button
            type="button"
            onClick={tryAgain}
            className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Try again
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
