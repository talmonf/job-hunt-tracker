"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteEvent } from "@/lib/actions/jobs";
import { JOB_EVENT_LOGGED, type LoggedHistoryEvent } from "@/lib/job-activity";
import { EmptyState } from "@/components/chrome";
import { ConfirmSubmit } from "@/components/widgets";
import { EventSummary } from "@/components/event-summary";
import { formatDateTime, formatScheduledRange } from "@/lib/dates";
import { eventHappenedLabel, t, type Lang } from "@/lib/i18n";
import { eventLoggedAt, eventScheduledStart } from "@/lib/events";
import { dash } from "@/lib/mask";

type HistoryEvent = {
  id: string;
  type: string;
  occurredAt: Date | string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  createdAt: Date | string;
  stage: string | null;
  resultingStatus?: string | null;
  previousStatus?: string | null;
  counterpartyName: string;
  summary: string;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalize(event: HistoryEvent) {
  return {
    ...event,
    occurredAt: asDate(event.occurredAt),
    startsAt: event.startsAt ? asDate(event.startsAt) : null,
    endsAt: event.endsAt ? asDate(event.endsAt) : null,
    createdAt: asDate(event.createdAt),
  };
}

export function EventHistoryTable({
  lang,
  timezone,
  hide,
  events,
  editHref,
  returnTo,
  liveJobId,
}: {
  lang: Lang;
  timezone: string;
  hide: boolean;
  events: HistoryEvent[];
  editHref: string;
  returnTo: string;
  liveJobId?: string;
}) {
  const [extra, setExtra] = useState<ReturnType<typeof normalize>[]>([]);
  useEffect(() => {
    if (!liveJobId) return;
    function onLogged(event: Event) {
      const detail = (event as CustomEvent<{ jobId: string; event: LoggedHistoryEvent }>).detail;
      if (!detail || detail.jobId !== liveJobId) return;
      const row = normalize(detail.event);
      setExtra((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    }
    window.addEventListener(JOB_EVENT_LOGGED, onLogged);
    return () => window.removeEventListener(JOB_EVENT_LOGGED, onLogged);
  }, [liveJobId]);
  const seen = new Set(extra.map((event) => event.id));
  const rows = [...extra, ...events.map(normalize).filter((event) => !seen.has(event.id))].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
  if (rows.length === 0) {
    return <EmptyState>{t(lang, "emptyEvents")}</EmptyState>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="min-w-full text-start text-sm">
        <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            <th className="px-3 py-2">{t(lang, "eventType")}</th>
            <th className="px-3 py-2">{t(lang, "when")}</th>
            <th className="px-3 py-2">{t(lang, "scheduled")}</th>
            <th className="px-3 py-2">{t(lang, "who")}</th>
            <th className="px-3 py-2">{t(lang, "summary")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => {
            const scheduled = eventScheduledStart(event);
            return (
              <tr key={event.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{eventHappenedLabel(lang, event.type, event.stage, event.resultingStatus, event.previousStatus)}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDateTime(eventLoggedAt(event), timezone)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {scheduled ? formatScheduledRange(scheduled, event.endsAt, timezone, lang) : "—"}
                </td>
                <td className="px-3 py-2">{dash(event.counterpartyName, hide)}</td>
                <td className="max-w-xs px-3 py-2 text-slate-300">
                  <EventSummary text={dash(event.summary, hide)} moreLabel={t(lang, "more")} lessLabel={t(lang, "less")} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3 whitespace-nowrap">
                    <Link className="text-sky-300" href={editHref.replace("{id}", encodeURIComponent(event.id))}>
                      {t(lang, "edit")}
                    </Link>
                    <ConfirmSubmit
                      action={deleteEvent}
                      message={t(lang, "deleteConfirm")}
                      label={t(lang, "delete")}
                      className="text-rose-300"
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                    </ConfirmSubmit>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
