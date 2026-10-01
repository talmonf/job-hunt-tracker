"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { confirmDirectStatusChange, setJobStatus } from "@/lib/actions/jobs";
import { JOB_STATUSES } from "@/lib/events";
import { statusLabel, t, type Lang } from "@/lib/i18n";
import { statusClass } from "./chrome";

export function JobStatusEditor({
  jobId,
  status,
  lang,
  fit = false,
}: {
  jobId: string;
  status: string;
  lang: Lang;
  fit?: boolean;
}) {
  const [value, setValue] = useState(status);
  const [notice, setNotice] = useState<{ from: string; to: string } | null>(null);
  const [pending, start] = useTransition();
  const finishing = useRef(false);

  function onChange(next: string) {
    if (!next || next === value || pending) return;
    const previous = value;
    setValue(next);
    const data = new FormData();
    data.set("jobId", jobId);
    data.set("status", next);
    start(async () => {
      try {
        const saved = await setJobStatus(data);
        if (!saved) {
          setValue(previous);
          return;
        }
        setNotice({ from: previous, to: next });
      } catch {
        setValue(previous);
      }
    });
  }

  function keepDirect() {
    if (!notice || pending || finishing.current) return;
    finishing.current = true;
    const from = notice.from;
    const data = new FormData();
    data.set("jobId", jobId);
    data.set("fromStatus", from);
    data.set("status", notice.to);
    start(async () => {
      try {
        const saved = await confirmDirectStatusChange(data);
        if (!saved) {
          await restoreStatus(from);
          return;
        }
        setNotice(null);
      } catch {
        await restoreStatus(from);
      } finally {
        finishing.current = false;
      }
    });
  }

  async function restoreStatus(from: string) {
    const data = new FormData();
    data.set("jobId", jobId);
    data.set("status", from);
    await setJobStatus(data);
    setValue(from);
    setNotice(null);
  }

  const logHref = `/events?modal=new&presetJob=${encodeURIComponent(jobId)}&presetType=status_change&presetStatus=${encodeURIComponent(notice?.to ?? value)}`;

  return (
    <>
      <select
        className={`${fit ? "w-auto" : "w-full"} min-w-[7.5rem] rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 text-xs outline-none focus:border-sky-500 disabled:opacity-60 ${statusClass(value)}`}
        aria-label={t(lang, "status")}
        disabled={pending}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {JOB_STATUSES.map((option) => (
          <option key={option} value={option}>
            {statusLabel(lang, option)}
          </option>
        ))}
      </select>
      {notice && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4"
              role="presentation"
              onMouseDown={() => keepDirect()}
              onKeyDown={(event) => {
                if (event.key === "Escape") keepDirect();
              }}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={`status-warn-${jobId}`}
                className="w-full max-w-md rounded-lg border border-amber-600 bg-slate-900 p-4 text-sm text-amber-50 shadow-lg"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <p id={`status-warn-${jobId}`}>{t(lang, "statusDirectWarn")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={logHref} autoFocus>
                    {t(lang, "logEvent")}
                  </Link>
                  <button className="text-sm text-slate-300 disabled:opacity-60" type="button" disabled={pending} onClick={() => keepDirect()}>
                    {t(lang, "notNow")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
