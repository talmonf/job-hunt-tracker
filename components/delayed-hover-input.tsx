"use client";

import { useEffect, useRef, useState } from "react";

const HOVER_DELAY_MS = 2000;

export function DelayedHoverInput({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue: string;
  className: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tip, setTip] = useState<{ top?: number; bottom?: number; left: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(defaultValue);
  valueRef.current = value;

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setTip(null);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <span
      className="relative block min-w-0"
      onMouseEnter={(event) => {
        const text = valueRef.current.trim();
        if (!text) return;
        const target = event.currentTarget;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const shown = valueRef.current.trim();
          if (!shown) return;
          const rect = target.getBoundingClientRect();
          const width = 320;
          const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 96) setTip({ bottom: window.innerHeight - rect.top + 4, left, text: shown });
          else setTip({ top: rect.bottom + 4, left, text: shown });
        }, HOVER_DELAY_MS);
      }}
      onMouseLeave={hide}
    >
      <input className={className} name={name} value={value} onChange={(event) => setValue(event.target.value)} />
      {tip ? (
        <span
          className="pointer-events-none fixed z-50 w-80 max-w-[calc(100vw-1rem)] whitespace-pre-wrap break-words rounded-md border border-slate-600 bg-slate-900 p-2 text-xs leading-relaxed text-slate-100 shadow-lg"
          style={{ top: tip.top, bottom: tip.bottom, left: tip.left }}
        >
          {tip.text}
        </span>
      ) : null}
    </span>
  );
}
