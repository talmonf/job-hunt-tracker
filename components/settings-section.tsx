"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";

export function SettingsSection({
  title,
  summary,
  badge,
  badgeClassName = "bg-slate-800 text-slate-200",
  className = "",
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  badge?: string;
  badgeClassName?: string;
  className?: string;
  id?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      id={id}
      className={`group mb-3 min-w-0 rounded-md border border-slate-700 ${className}`}
      open={open}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-current text-slate-400 transition-transform ltr:group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">
          <path d="M7.2 4.5a1 1 0 0 1 1.4 0l5 5.2a1 1 0 0 1 0 1.4l-5 5.2a1 1 0 0 1-1.4-1.4L11.4 10 7.2 5.9a1 1 0 0 1 0-1.4Z" />
        </svg>
        <h2 className="shrink-0 text-lg">{title}</h2>
        {summary ? <div className="min-w-0 flex-1 text-sm font-normal text-slate-300">{summary}</div> : null}
        {badge ? <span className={`${summary ? "" : "ms-auto"} shrink-0 rounded-full px-2 py-0.5 text-xs ${badgeClassName}`}>{badge}</span> : null}
      </summary>
      <div className="border-t border-slate-700 px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}
