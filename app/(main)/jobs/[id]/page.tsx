import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, dateTimeInputValue, formatDateTime } from "@/lib/dates";
import { channelLabel, eventTypeLabel, stageLabel, statusLabel, t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { addJobUrl, deleteCv, deleteEvent, deleteJob, deleteJobUrl, saveEvent, updateJob, uploadCv } from "@/lib/actions/jobs";
import { PageFrame, statusClass } from "@/components/chrome";
import { DateField, DateTimeField, SubmitButton, fieldClass, labelClass } from "@/components/widgets";
import { EventForm } from "@/components/event-form";
import { firstParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const { id } = await params;
  const search = await searchParams;
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      urls: true,
      cvs: { orderBy: { uploadedAt: "desc" } },
      events: { orderBy: { occurredAt: "desc" }, include: { contact: true, noteVersion: { include: { note: true } } } },
    },
  });
  if (!job) notFound();
  const [jobs, contacts, versions] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.noteVersion.findMany({ where: { note: { userId: user.id } }, include: { note: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const lang = user.uiLanguage;
  const editing = job.events.find((event) => event.id === firstParam(search.editEvent));
  return (
    <PageFrame lang={lang} backHref="/jobs" title={dash(job.companyName, hide)} description={t(lang, "jobDetailIntro")} search={search}>
      <p className={`mb-4 text-sm ${statusClass(job.status)}`}>
        {t(lang, "status")}: {statusLabel(lang, job.status)}
      </p>
      <form action={updateJob} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="jobId" value={job.id} />
        <label>
          <span className={labelClass}>{t(lang, "company")}</span>
          <input className={fieldClass} name="companyName" defaultValue={job.companyName} required />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "title")}</span>
          <input className={fieldClass} name="title" defaultValue={job.title} />
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>{t(lang, "description")}</span>
          <textarea className={fieldClass} name="description" rows={5} defaultValue={job.description} />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "interestDate")}</span>
          <DateField name="interestDate" defaultValue={dateInputValue(job.interestDate, user.timezone)} required />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "followUp")}</span>
          <DateTimeField name="followUpAt" defaultValue={dateTimeInputValue(job.followUpAt, user.timezone)} required />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "reminderLead")} — {t(lang, "days")}</span>
          <input className={fieldClass} name="reminderLeadDays" defaultValue={job.reminderLeadDays ?? ""} inputMode="numeric" />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "hours")}</span>
          <input className={fieldClass} name="reminderLeadHours" defaultValue={job.reminderLeadHours ?? ""} inputMode="numeric" />
        </label>
        <div className="md:col-span-2">
          <SubmitButton label={t(lang, "save")} />
        </div>
      </form>
      <p className="mt-2 text-xs text-slate-400">{t(lang, "reminderBlank")}</p>

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "urls")}</h2>
      <ul className="space-y-2 text-sm">
        {job.urls.map((url) => (
          <li key={url.id} className="flex items-center justify-between gap-3">
            <a className="truncate text-sky-300" href={url.url} target="_blank" rel="noreferrer">
              {maskText(url.url, hide)}
            </a>
            <form action={deleteJobUrl}>
              <input type="hidden" name="urlId" value={url.id} />
              <button className="text-rose-300" type="submit">{t(lang, "delete")}</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={addJobUrl} className="mt-2 flex gap-2">
        <input type="hidden" name="jobId" value={job.id} />
        <input className={fieldClass} name="url" placeholder="https://" />
        <SubmitButton label={t(lang, "add")} />
      </form>

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "cvCount")}</h2>
      <ul className="space-y-2 text-sm">
        {job.cvs.map((cv) => (
          <li key={cv.id} className="flex items-center justify-between gap-3">
            <a className="text-sky-300" href={`/files/cv/${cv.id}`}>
              {dash(cv.filename, hide)}
            </a>
            <form action={deleteCv}>
              <input type="hidden" name="cvId" value={cv.id} />
              <button className="text-rose-300" type="submit">{t(lang, "delete")}</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={uploadCv} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="jobId" value={job.id} />
        <input name="file" type="file" />
        <SubmitButton label={t(lang, "uploadCv")} />
      </form>

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "logEvent")}</h2>
      <EventForm
        action={saveEvent}
        lang={lang}
        calendarLinked={Boolean(user.calendarRefreshToken)}
        defaultJobId={job.id}
        jobs={jobs.map((item) => ({ id: item.id, label: dash(`${item.companyName}${item.title ? ` — ${item.title}` : ""}`, hide) }))}
        contacts={contacts.map((item) => ({ id: item.id, label: dash(item.fullName, hide) }))}
        notes={versions.map((item) => ({ id: item.id, label: maskText(`${item.note.title} v${item.version}`, hide) }))}
        cvs={job.cvs.map((cv) => ({ id: cv.id, label: dash(cv.filename, hide) }))}
        event={
          editing
            ? {
                id: editing.id,
                type: editing.type,
                occurredAt: dateTimeInputValue(editing.occurredAt, user.timezone),
                endsAt: editing.endsAt ? dateTimeInputValue(editing.endsAt, user.timezone) : "",
                channel: editing.channel ?? "",
                stage: editing.stage ?? "",
                counterpartyName: editing.counterpartyName,
                summary: editing.summary,
                noteVersionId: editing.noteVersionId ?? "",
                cvId: editing.cvId ?? "",
                tailoredCv: Boolean(editing.tailoredCv),
                resultingStatus: editing.resultingStatus ?? "",
                onCalendar: Boolean(editing.googleCalendarEventId),
              }
            : undefined
        }
      />

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "history")}</h2>
      <ol className="space-y-3">
        {job.events.map((event) => (
          <li key={event.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{eventTypeLabel(lang, event.type)}</span>
              <span>{formatDateTime(event.occurredAt, user.timezone)}{event.endsAt ? ` – ${formatDateTime(event.endsAt, user.timezone)}` : ""}</span>
            </div>
            {event.resultingStatus ? <p className={statusClass(event.resultingStatus)}>{statusLabel(lang, event.resultingStatus)}</p> : null}
            {event.counterpartyName ? <p>{t(lang, "who")}: {dash(event.counterpartyName, hide)}</p> : null}
            {event.channel ? <p>{channelLabel(lang, event.channel)}</p> : null}
            {event.stage ? <p>{stageLabel(lang, event.stage)}</p> : null}
            {event.contact ? <p>{dash(event.contact.fullName, hide)}</p> : null}
            {event.summary ? <p className="whitespace-pre-wrap text-slate-300">{dash(event.summary, hide)}</p> : null}
            {event.noteVersion ? (
              <p>
                <Link className="text-sky-300" href={`/notes/${event.noteVersion.noteId}`}>
                  {maskText(`${event.noteVersion.note.title} v${event.noteVersion.version}`, hide)}
                </Link>
              </p>
            ) : null}
            {event.googleCalendarHtmlLink ? (
              <a className="text-sky-300" href={event.googleCalendarHtmlLink} target="_blank" rel="noreferrer">
                Google Calendar
              </a>
            ) : null}
            <div className="mt-2 flex gap-3">
              <Link className="text-sky-300" href={`/jobs/${job.id}?editEvent=${event.id}`}>{t(lang, "edit")}</Link>
              <form action={deleteEvent}>
                <input type="hidden" name="eventId" value={event.id} />
                <button className="text-rose-300" type="submit">{t(lang, "delete")}</button>
              </form>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <form action={deleteJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
        </form>
      </div>
    </PageFrame>
  );
}
