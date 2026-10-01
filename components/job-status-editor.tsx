"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { JOB_EVENT_LOGGED, type EventFormCatalog, type LoggedHistoryEvent } from "@/lib/job-activity";
import { JOB_STATUSES } from "@/lib/events";
import { statusLabel, t, type Lang } from "@/lib/i18n";
import { statusClass } from "./chrome";
import { EventForm, type InlineEventResult } from "./event-form";
import { primaryButton } from "./widgets";

function publishLoggedEvent(jobId: string, event: LoggedHistoryEvent) {
  window.dispatchEvent(new CustomEvent(JOB_EVENT_LOGGED, { detail: { jobId, event } }));
}

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
  const [eventOpen, setEventOpen] = useState(false);
  const [catalog, setCatalog] = useState<EventFormCatalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const loadGeneration = useRef(0);

  useEffect(() => {
    if (!notice && !eventOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || saving) return;
      loadGeneration.current += 1;
      if (eventOpen) {
        setEventOpen(false);
        setCatalog(null);
        setLoadError("");
        return;
      }
      setNotice(null);
      setActionError("");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [notice, eventOpen, saving]);

  function onChange(next: string) {
    if (!next || next === value || notice || saving) return;
    if (!(JOB_STATUSES as readonly string[]).includes(next)) return;
    setBanner("");
    setActionError("");
    setNotice({ from: value, to: next });
  }

  function cancel() {
    if (saving) return;
    loadGeneration.current += 1;
    setNotice(null);
    setEventOpen(false);
    setCatalog(null);
    setLoadError("");
    setActionError("");
  }

  function closeEvent() {
    if (saving) return;
    loadGeneration.current += 1;
    setEventOpen(false);
    setCatalog(null);
    setLoadError("");
  }

  async function openLog() {
    if (!notice || saving) return;
    const generation = ++loadGeneration.current;
    setEventOpen(true);
    setCatalog(null);
    setLoadError("");
    setActionError("");
    try {
      const response = await fetch("/api/job-activity");
      const body = (await response.json().catch(() => null)) as EventFormCatalog | { error?: string } | null;
      if (loadGeneration.current !== generation) return;
      if (!response.ok || !body || !("jobs" in body)) {
        setLoadError(t(lang, "errorGeneric"));
        return;
      }
      setCatalog(body);
    } catch {
      if (loadGeneration.current !== generation) return;
      setLoadError(t(lang, "errorGeneric"));
    }
  }

  async function keepDirect() {
    if (!notice || saving) return;
    setSaving(true);
    setActionError("");
    const data = new FormData();
    data.set("intent", "status");
    data.set("jobId", jobId);
    data.set("status", notice.to);
    try {
      const response = await fetch("/api/job-activity", { method: "POST", body: data });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; status?: string; event?: LoggedHistoryEvent | null } | null;
      if (!response.ok || !body?.ok || !body.status) {
        setActionError(t(lang, "errorGeneric"));
        return;
      }
      setValue(body.status);
      if (body.event) publishLoggedEvent(jobId, body.event);
      setNotice(null);
      setEventOpen(false);
    } catch {
      setActionError(t(lang, "errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function submitInline(formData: FormData): Promise<InlineEventResult> {
    formData.set("intent", "event");
    formData.set("focusJobId", jobId);
    setSaving(true);
    try {
      const response = await fetch("/api/job-activity", { method: "POST", body: formData });
      const body = (await response.json().catch(() => null)) as
        | { ok: true; status: string | null; event: LoggedHistoryEvent | null; warn?: "calendar" }
        | { ok: false; error: string }
        | null;
      if (!response.ok || !body || !("ok" in body) || !body.ok) {
        return { ok: false, error: body && "error" in body && body.error ? body.error : "generic" };
      }
      return body;
    } finally {
      setSaving(false);
    }
  }

  function onInlineResult(result: Extract<InlineEventResult, { ok: true }>) {
    if (result.status) setValue(result.status);
    if (result.event) publishLoggedEvent(jobId, result.event);
    setBanner(result.warn === "calendar" ? t(lang, "warnCalendar") : "");
    setNotice(null);
    setEventOpen(false);
    setCatalog(null);
  }

  const warn = notice ? (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation"
      onMouseDown={() => cancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`status-warn-${jobId}`}
        className="w-full max-w-md rounded-lg border border-amber-600 bg-slate-900 p-4 text-sm text-amber-50 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p id={`status-warn-${jobId}`}>{t(lang, "statusDirectWarn")}</p>
          <button className="text-xl leading-none text-slate-300" type="button" aria-label={t(lang, "close")} onClick={() => cancel()}>
            ×
          </button>
        </div>
        <p className="mt-2 font-medium">
          {statusLabel(lang, notice.from)} → {statusLabel(lang, notice.to)}
        </p>
        {actionError ? <p className="mt-2 text-rose-300">{actionError}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className={primaryButton} type="button" autoFocus disabled={saving} onClick={() => void openLog()}>
            {t(lang, "logEvent")}
          </button>
          <button className="text-sm text-slate-300 disabled:opacity-60" type="button" disabled={saving} onClick={() => void keepDirect()}>
            {t(lang, "updateAnyway")}
          </button>
          <button className="text-sm text-slate-300 disabled:opacity-60" type="button" disabled={saving} onClick={() => cancel()}>
            {t(lang, "cancel")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const logDialog = eventOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/75 p-4"
      role="presentation"
      onMouseDown={() => closeEvent()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`status-log-${jobId}`}
        className="mt-8 w-full max-w-2xl rounded-xl bg-slate-900 p-4 ring-1 ring-slate-700"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`status-log-${jobId}`} className="text-lg font-semibold">
            {t(lang, "logEvent")}
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <button className="text-sky-300" type="button" onClick={() => closeEvent()}>
              {t(lang, "cancel")}
            </button>
            <button className="text-xl leading-none text-slate-300" type="button" aria-label={t(lang, "close")} onClick={() => closeEvent()}>
              ×
            </button>
          </div>
        </div>
        {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
        {catalog && notice ? (
          <EventForm
            key={`${notice.to}-${catalog.occurredAt}`}
            lang={lang}
            submitInline={submitInline}
            onInlineResult={onInlineResult}
            focusJobId={jobId}
            calendarLinked={catalog.calendarLinked}
            defaultJobId={jobId}
            defaultType="status_change"
            defaultResultingStatus={notice.to}
            defaultOccurredAt={catalog.occurredAt}
            jobs={catalog.jobs}
            contacts={catalog.contacts}
            notes={catalog.notes}
            cvs={catalog.cvs}
          />
        ) : loadError ? null : (
          <p className="text-sm text-slate-300">{t(lang, "loading")}</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <span className={fit ? "inline-flex flex-col items-start gap-1" : "flex w-full flex-col items-start gap-1"}>
      <select
        className={`${fit ? "w-auto" : "w-full"} min-w-[7.5rem] rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 text-xs outline-none focus:border-sky-500 disabled:opacity-60 ${statusClass(notice?.to ?? value)}`}
        aria-label={t(lang, "status")}
        disabled={saving || Boolean(notice)}
        value={notice?.to ?? value}
        onChange={(event) => onChange(event.target.value)}
      >
        {JOB_STATUSES.map((option) => (
          <option key={option} value={option}>
            {statusLabel(lang, option)}
          </option>
        ))}
      </select>
      {banner ? <span className="max-w-xs text-xs text-amber-200">{banner}</span> : null}
      {notice && typeof document !== "undefined" ? createPortal(warn, document.body) : null}
      {eventOpen && typeof document !== "undefined" ? createPortal(logDialog, document.body) : null}
    </span>
  );
}
