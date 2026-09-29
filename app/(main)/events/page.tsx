import Link from "next/link";
import type { EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { allParams, firstParam, preserveQuery } from "@/lib/http";
import { parseDateOnly } from "@/lib/forms";
import { EVENT_TYPES } from "@/lib/events";
import { eventTypeLabel, t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { dateTimeInputValue, formatDateTime } from "@/lib/dates";
import { deleteEvent, saveEvent } from "@/lib/actions/jobs";
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { ConfirmSubmit, DateField, MultiSelect, fieldClass, labelClass } from "@/components/widgets";
import { EventForm } from "@/components/event-form";

export const dynamic = "force-dynamic";

const SORTS = ["occurredAt", "type"] as const;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const q = firstParam(search.q);
  const types = allParams(search.type).filter((type): type is EventType =>
    (EVENT_TYPES as readonly string[]).includes(type),
  );
  const sort = SORTS.includes(firstParam(search.sort) as (typeof SORTS)[number])
    ? (firstParam(search.sort) as (typeof SORTS)[number])
    : "occurredAt";
  const dirRaw = firstParam(search.dir);
  const dir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : "desc";
  const occurredFrom = parseDateOnly(firstParam(search.occurredFrom), user.timezone);
  const occurredTo = parseDateOnly(firstParam(search.occurredTo) ? `${firstParam(search.occurredTo)}T23:59` : "", user.timezone);
  const where: Prisma.EventWhereInput = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" } },
            { counterpartyName: { contains: q, mode: "insensitive" } },
            { job: { companyName: { contains: q, mode: "insensitive" } } },
            { job: { title: { contains: q, mode: "insensitive" } } },
            { contact: { fullName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(types.length ? { type: { in: types } } : {}),
    ...(occurredFrom || occurredTo
      ? { occurredAt: { gte: occurredFrom ?? undefined, lte: occurredTo ?? undefined } }
      : {}),
  };
  const [events, jobs, contacts, versions, cvs] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { [sort]: dir },
      include: { job: true, contact: true },
    }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.noteVersion.findMany({
      where: { note: { userId: user.id } },
      include: { note: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobCv.findMany({
      where: { job: { userId: user.id } },
      include: { job: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  const keep = preserveQuery(search, {}, ["modal", "eventId"]);
  const closeHref = `/events${keep}`;
  const editing = firstParam(search.modal) === "edit" ? events.find((event) => event.id === firstParam(search.eventId)) : undefined;
  const jobOptions = jobs.map((job) => ({
    id: job.id,
    label: dash(`${job.companyName}${job.title ? ` — ${job.title}` : ""}`, hide),
  }));
  const contactOptions = contacts.map((item) => ({ id: item.id, label: dash(item.fullName, hide) }));
  const noteOptions = versions.map((item) => ({ id: item.id, label: maskText(`${item.note.title} v${item.version}`, hide) }));
  const cvOptions = cvs.map((cv) => ({
    id: cv.id,
    jobId: cv.jobId,
    label: dash(`${cv.job.companyName} — ${cv.filename}`, hide),
  }));

  return (
    <PageFrame lang={lang} title={t(lang, "events")} description={t(lang, "eventsIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t(lang, "events")}</h2>
        <Link
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950"
          href={`/events${preserveQuery(search, { modal: "new" }, ["modal", "eventId"])}`}
        >
          {t(lang, "logEvent")}
        </Link>
      </div>
      <form className="mb-4 rounded-lg border border-slate-700 p-3" method="get">
        <fieldset>
          <legend className="px-1 text-sm text-slate-200">{t(lang, "filters")}</legend>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          {["created", "updated", "error", "warn"].map((key) =>
            firstParam(search[key]) ? <input key={key} type="hidden" name={key} value={firstParam(search[key])} /> : null,
          )}
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <label>
              <span className={labelClass}>{t(lang, "search")}</span>
              <input className={fieldClass} name="q" defaultValue={q} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "eventType")}</span>
              <MultiSelect
                name="type"
                selected={types}
                anyLabel={t(lang, "any")}
                selectAll={t(lang, "selectAll")}
                deselectAll={t(lang, "deselectAll")}
                done={t(lang, "done")}
                selectedWord={t(lang, "selectedCount")}
                options={EVENT_TYPES.map((type) => ({ value: type, label: eventTypeLabel(lang, type) }))}
              />
            </label>
            <div />
            <label>
              <span className={labelClass}>{t(lang, "when")} {t(lang, "from")}</span>
              <DateField name="occurredFrom" defaultValue={firstParam(search.occurredFrom)} lang={lang} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "to")}</span>
              <DateField name="occurredTo" defaultValue={firstParam(search.occurredTo)} lang={lang} />
            </label>
          </div>
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">
            {t(lang, "apply")}
          </button>
        </fieldset>
      </form>
      {events.length === 0 ? (
        <EmptyState>{t(lang, "emptyEvents")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <SortHead label={t(lang, "eventType")} column="type" sort={sort} dir={dir} search={search} />
                <SortHead label={t(lang, "when")} column="occurredAt" sort={sort} dir={dir} search={search} />
                <th className="px-3 py-2">{t(lang, "jobs")}</th>
                <th className="px-3 py-2">{t(lang, "networking")}</th>
                <th className="px-3 py-2">{t(lang, "who")}</th>
                <th className="px-3 py-2">{t(lang, "summary")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{eventTypeLabel(lang, event.type)}</td>
                  <td className="px-3 py-2">
                    {formatDateTime(event.occurredAt, user.timezone)}
                    {event.endsAt ? ` – ${formatDateTime(event.endsAt, user.timezone)}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    {event.job ? (
                      <Link className="text-sky-300" href={`/jobs/${event.job.id}`}>
                        {dash(`${event.job.companyName}${event.job.title ? ` — ${event.job.title}` : ""}`, hide)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {event.contact ? (
                      <Link className="text-sky-300" href={`/contacts/${event.contact.id}`}>
                        {dash(event.contact.fullName, hide)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{dash(event.counterpartyName, hide)}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-300">{dash(event.summary, hide)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3 whitespace-nowrap">
                      <Link
                        className="text-sky-300"
                        href={`/events${preserveQuery(search, { modal: "edit", eventId: event.id }, ["modal", "eventId"])}`}
                      >
                        {t(lang, "edit")}
                      </Link>
                      <ConfirmSubmit
                        action={deleteEvent}
                        message={t(lang, "deleteConfirm")}
                        label={t(lang, "delete")}
                        className="text-rose-300"
                      >
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="returnTo" value={`/events${keep}`} />
                      </ConfirmSubmit>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "logEvent")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <EventForm
            action={saveEvent}
            lang={lang}
            calendarLinked={Boolean(user.calendarRefreshToken)}
            returnTo={`/events${keep}`}
            jobs={jobs.map((job) => ({
              id: job.id,
              label: dash(`${job.companyName}${job.title ? ` — ${job.title}` : ""}`, hide),
            }))}
            contacts={contacts.map((item) => ({ id: item.id, label: dash(item.fullName, hide) }))}
            notes={versions.map((item) => ({ id: item.id, label: maskText(`${item.note.title} v${item.version}`, hide) }))}
            cvs={cvs.map((cv) => ({
              id: cv.id,
              jobId: cv.jobId,
              label: dash(`${cv.job.companyName} — ${cv.filename}`, hide),
            }))}
          />
        </Modal>
      ) : null}
    </PageFrame>
  );
}

function SortHead({
  label,
  column,
  sort,
  dir,
  search,
}: {
  label: string;
  column: string;
  sort: string;
  dir: string;
  search: Record<string, string | string[] | undefined>;
}) {
  const nextDir = sort === column && dir === "asc" ? "desc" : "asc";
  const href = `/events${preserveQuery(search, { sort: column, dir: nextDir }, ["modal", "created", "updated", "error", "warn"])}`;
  const active = sort === column;
  return (
    <th className="px-3 py-2" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href}>
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}
