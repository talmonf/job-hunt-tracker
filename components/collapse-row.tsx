import type { ReactNode } from "react";

export function CollapseRow({
  summary,
  children,
  id,
  className = "",
}: {
  summary: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <details id={id} className={`group min-w-0 rounded-md border border-slate-700 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-current text-slate-400 transition-transform ltr:group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">
          <path d="M7.2 4.5a1 1 0 0 1 1.4 0l5 5.2a1 1 0 0 1 0 1.4l-5 5.2a1 1 0 0 1-1.4-1.4L11.4 10 7.2 5.9a1 1 0 0 1 0-1.4Z" />
        </svg>
        <span className="min-w-0 truncate text-sm text-slate-200">{summary || "—"}</span>
      </summary>
      <div className="grid gap-2 border-t border-slate-700 p-3 text-sm">{children}</div>
    </details>
  );
}
