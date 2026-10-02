"use client";

import { useEffect, useRef, useState } from "react";

export function ExpandableNote({
  text,
  moreLabel,
  lessLabel,
}: {
  text: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const canExpand = text !== "—" && text !== "••••";
  const likelyLong = canExpand && (text.length > 48 || /[\n\r]/.test(text));

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  const showToggle = canExpand && (overflows || expanded || likelyLong);

  return (
    <div className={`group relative min-w-[8rem] ${expanded ? "max-w-xl" : "max-w-xs"}`}>
      <p
        ref={textRef}
        className={expanded ? "whitespace-pre-wrap break-words" : "truncate"}
        title={canExpand && !expanded ? text : undefined}
      >
        {text}
      </p>
      {canExpand && overflows && !expanded ? (
        <div className="pointer-events-none absolute start-0 top-full z-20 mt-1 hidden max-w-sm whitespace-pre-wrap break-words rounded-md border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100 shadow-lg group-hover:block">
          {text}
        </div>
      ) : null}
      {showToggle ? (
        <button type="button" className="mt-1 text-xs text-sky-300" onClick={() => setExpanded((value) => !value)}>
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
