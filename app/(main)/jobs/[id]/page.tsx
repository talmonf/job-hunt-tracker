import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, dateTimeInputValue } from "@/lib/dates";
import { statusLabel, t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { eventFormValues } from "@/lib/events";
import { addJobUrl, deleteCv, deleteJob, deleteJobUrl, saveEvent, updateJob, uploadCv } from "@/lib/actions/jobs";
import { toChipLink } from "@/lib/entity-links";
import { PageFrame, statusClass } from "@/components/chrome";
import { DateField, DateTimeField, SubmitButton, fieldClass, labelClass } from "@/components/widgets";
import { EventForm } from "@/components/event-form";
import { EventHistoryTable } from "@/components/event-history";
import { EntityLinksSection } from "@/components/entity-links";
import { MentionText } from "@/components/mention-text";
import { MentionTextarea } from "@/components/mention-textarea";
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
  const [job, notes, contacts] = await Promise.all([
    prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        urls: true,
        cvs: { orderBy: { uploadedAt: "desc" } },
        events: { orderBy: { occurredAt: "desc" } },
        entityLinks: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
  ]);
  if (!job) notFound();
  const lang = user.uiLanguage;
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  const people = job.entityLinks.map(toChipLink);
  const googleConnected = Boolean(user.contactsRefreshToken);
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
        <div className="md:col-span-2">
          {job.description ? (
            <div className="mb-3">
              <p className={`${labelClass}`}>{t(lang, "preview")}</p>
              <MentionText text={job.description} hide={hide} lookup={{ contacts: localContacts, links: people }} />
            </div>
          ) : null}
          <MentionTextarea
            lang={lang}
            name="description"
            label={t(lang, "description")}
            defaultValue={job.description}
            rows={5}
            localContacts={localContacts}
            googleConnected={googleConnected}
            allowUrl={false}
          />
        </div>
        <label>
          <span className={labelClass}>{t(lang, "interestDate")}</span>
          <DateField name="interestDate" defaultValue={dateInputValue(job.interestDate, user.timezone)} required lang={lang} />
        </label>
        <div>
          <span className={labelClass}>{t(lang, "followUp")}</span>
          <DateTimeField name="followUpAt" defaultValue={dateTimeInputValue(job.followUpAt, user.timezone)} required lang={lang} />
        </div>
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

      <EntityLinksSection
        lang={lang}
        hide={hide}
        links={people}
        jobId={job.id}
        localContacts={localContacts}
        googleConnected={googleConnected}
      />

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
        lockLinks
        defaultJobId={job.id}
        defaultContactId={editing?.contactId ?? undefined}
        jobs={[]}
        contacts={[]}
        notes={notes.map((item) => ({ id: item.id, label: dash(item.title, hide) }))}
        cvs={job.cvs.map((cv) => ({ id: cv.id, label: dash(cv.filename, hide) }))}
        event={editing ? eventFormValues(editing, user.timezone) : undefined}
      />

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "history")}</h2>
      <EventHistoryTable
        lang={lang}
        timezone={user.timezone}
        hide={hide}
        events={job.events}
        editHref={(eventId) => `/jobs/${job.id}?editEvent=${eventId}`}
        returnTo={`/jobs/${job.id}`}
      />
      <div className="mt-8">
        <form action={deleteJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
        </form>
      </div>
    </PageFrame>
  );
}
