"use client";

import { useState } from "react";

export function HoverText({ text }: { text: string }) {
  const [tip, setTip] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const show = text !== "—" && text !== "••••";

  return (
    <span
      className="block truncate"
      onMouseEnter={(event) => {
        if (!show) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const width = 320;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 96) setTip({ bottom: window.innerHeight - rect.top + 4, left });
        else setTip({ top: rect.bottom + 4, left });
      }}
      onMouseLeave={() => setTip(null)}
    >
      {text}
      {tip ? (
        <span
          className="pointer-events-none fixed z-50 w-80 max-w-[calc(100vw-1rem)] whitespace-pre-wrap break-words rounded-md border border-slate-600 bg-slate-900 p-2 text-xs leading-relaxed text-slate-100 shadow-lg"
          style={{ top: tip.top, bottom: tip.bottom, left: tip.left }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
