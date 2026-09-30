import Link from "next/link";
import { deleteEvent } from "@/lib/actions/jobs";
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
  occurredAt: Date;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  stage: string | null;
  resultingStatus?: string | null;
  counterpartyName: string;
  summary: string;
};

export function EventHistoryTable({
  lang,
  timezone,
  hide,
  events,
  editHref,
  returnTo,
}: {
  lang: Lang;
  timezone: string;
  hide: boolean;
  events: HistoryEvent[];
  editHref: (eventId: string) => string;
  returnTo: string;
}) {
  if (events.length === 0) {
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
          {events.map((event) => {
            const scheduled = eventScheduledStart(event);
            return (
              <tr key={event.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{eventHappenedLabel(lang, event.type, event.stage, event.resultingStatus)}</td>
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
                    <Link className="text-sky-300" href={editHref(event.id)}>
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
