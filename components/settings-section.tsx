import type { ReactNode } from "react";

export function SettingsSection({
  title,
  badge,
  badgeClassName = "bg-slate-800 text-slate-200",
  children,
}: {
  title: string;
  badge?: string;
  badgeClassName?: string;
  children: ReactNode;
}) {
  return (
    <details className="group mb-3 rounded-md border border-slate-700">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-current text-slate-400 transition-transform ltr:group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">
          <path d="M7.2 4.5a1 1 0 0 1 1.4 0l5 5.2a1 1 0 0 1 0 1.4l-5 5.2a1 1 0 0 1-1.4-1.4L11.4 10 7.2 5.9a1 1 0 0 1 0-1.4Z" />
        </svg>
        <h2 className="text-lg">{title}</h2>
        {badge ? <span className={`ms-auto rounded-full px-2 py-0.5 text-xs ${badgeClassName}`}>{badge}</span> : null}
      </summary>
      <div className="border-t border-slate-700 px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}
