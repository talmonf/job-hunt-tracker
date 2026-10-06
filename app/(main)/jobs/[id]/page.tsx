import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, dateTimeInputValue, formatDateTime } from "@/lib/dates";
import { jobAttributeLabel, t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags, rankByOverlap } from "@/lib/tags";
import { EMPLOYMENT_TYPES, ENGAGEMENTS, WORK_ARRANGEMENTS } from "@/lib/events";
import { deleteCv, deleteJob, updateJob, uploadCv } from "@/lib/actions/jobs";
import { toChipLink } from "@/lib/entity-links";
import { PageFrame } from "@/components/chrome";
import { AttributeSelect, DateField, DateTimeField, SubmitButton, compactFieldClass, compactLabelClass, fieldClass, labelClass } from "@/components/widgets";
import { JobStatusEditor } from "@/components/job-status-editor";
import { JobUrlsEditor } from "@/components/job-urls";
import { EventHistoryTable } from "@/components/event-history";
import { JobPeopleSection } from "@/components/job-people";
import { MentionText } from "@/components/mention-text";
import { MentionTextarea } from "@/components/mention-textarea";
import { TagPicker } from "@/components/tag-picker";
import { RelatedByTags } from "@/components/related-tags";
import { SettingsSection } from "@/components/settings-section";
import { FillJobDetails } from "@/components/fill-job-details";
import { loadJobFillAccess } from "@/lib/ai/feature-grants";
import { CompanyNameField } from "@/components/company-picker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reminderFieldClass =
  "w-10 rounded border border-slate-600 bg-transparent px-0.5 py-0.5 text-center text-xs leading-tight text-slate-100 outline-none [color-scheme:dark] focus:border-sky-500";

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
  const [job, notes, contacts, employments, catalog, otherJobs, companies, jobFillAccess] = await Promise.all([
    prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        urls: true,
        cvs: { orderBy: { uploadedAt: "desc" } },
        events: { orderBy: { occurredAt: "desc" } },
        entityLinks: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { fullName: "asc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.employment.findMany({
      where: { userId: user.id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.job.findMany({
      where: { userId: user.id, NOT: { id } },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } }),
    loadJobFillAccess(user.id),
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
  const jobTags = assignmentTags(job.tags);
  const jobTagIds = jobTags.map((tag) => tag.id);
  const relatedJobs = rankByOverlap(
    otherJobs,
    (row) => assignmentTags(row.tags),
    jobTagIds,
    (row) => `${row.companyName} ${row.title}`,
  ).map((row) => ({
    id: row.item.id,
    label: row.item.title ? `${row.item.companyName} — ${row.item.title}` : row.item.companyName,
    overlap: row.overlap,
  }));
  const relatedEmployments = rankByOverlap(
    employments,
    (row) => assignmentTags(row.tags),
    jobTagIds,
    (row) => `${row.title} ${row.company}`,
  ).map((row) => ({ id: row.item.id, label: `${row.item.title} · ${row.item.company}`, overlap: row.overlap }));
  const relatedNotes = rankByOverlap(
    notes,
    (row) => assignmentTags(row.tags),
    jobTagIds,
    (row) => row.title,
  ).map((row) => ({ id: row.item.id, label: row.item.title, overlap: row.overlap }));
  const relatedContacts = rankByOverlap(
    contacts,
    (row) => assignmentTags(row.tags),
    jobTagIds,
    (row) => row.fullName,
  ).map((row) => ({ id: row.item.id, label: row.item.fullName, overlap: row.overlap }));
  const heading = (
    <>
      <Link className="text-sky-300 hover:text-sky-200" href={`/companies/${job.companyId}`}>
        {dash(job.companyName, hide)}
      </Link>
      {job.title ? ` — ${dash(job.title, hide)}` : ""}
    </>
  );
  const jobReturn = `/jobs/${job.id}`;
  const logHref = `/events?modal=new&presetJob=${encodeURIComponent(job.id)}&presetNow=1&returnTo=${encodeURIComponent(jobReturn)}`;
  const detailItems = [
    job.location?.trim() ? { label: t(lang, "location"), value: dash(job.location, hide) } : null,
    job.employmentType ? { label: t(lang, "employmentType"), value: jobAttributeLabel(lang, job.employmentType) } : null,
    job.workArrangement ? { label: t(lang, "workArrangement"), value: jobAttributeLabel(lang, job.workArrangement) } : null,
    job.engagement ? { label: t(lang, "engagement"), value: jobAttributeLabel(lang, job.engagement) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const detailSummary = detailItems.length ? (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {detailItems.map((item) => (
        <span key={item.label}>
          <span className="text-slate-500">{item.label} </span>
          {item.value}
        </span>
      ))}
    </span>
  ) : undefined;
  const followNote = job.followUpNote.trim();
  const followSummary = job.followUpAt || followNote ? (
    <span className="flex min-w-0 gap-x-4">
      {job.followUpAt ? <span className="shrink-0">{formatDateTime(job.followUpAt, user.timezone)}</span> : null}
      {followNote ? (
        <span className="min-w-0 truncate">
          <span className="text-slate-500">{t(lang, "followUpNote")} </span>
          {dash(followNote, hide)}
        </span>
      ) : null}
    </span>
  ) : undefined;
  return (
    <PageFrame
      lang={lang}
      backHref="/jobs"
      title={heading}
      titleAside={
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusEditor jobId={job.id} status={job.status} lang={lang} fit />
          <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={logHref}>
            {t(lang, "logEvent")}
          </Link>
        </div>
      }
      description={t(lang, "jobDetailIntro")}
      search={search}
    >
      <form id="job-form" action={updateJob}>
        <input type="hidden" name="jobId" value={job.id} />
        <div className="mb-3">
          <TagPicker lang={lang} hide={hide} tags={catalog} selected={jobTagIds} compact />
        </div>
        <SettingsSection title={t(lang, "jobDetails")} summary={detailSummary} defaultOpen>
          <FillJobDetails lang={lang} access={jobFillAccess} lead="edit">
            {job.description ? (
              <div>
                <p className={labelClass}>{t(lang, "preview")}</p>
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
          </FillJobDetails>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <CompanyNameField lang={lang} names={companies.map((company) => company.name)} defaultValue={job.companyName} required />
            <label>
              <span className={labelClass}>{t(lang, "title")}</span>
              <input className={fieldClass} name="title" defaultValue={job.title} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "location")}</span>
              <input className={fieldClass} name="location" defaultValue={job.location} />
            </label>
            <AttributeSelect
              lang={lang}
              name="employmentType"
              label={t(lang, "employmentType")}
              options={EMPLOYMENT_TYPES}
              value={job.employmentType ?? ""}
            />
            <AttributeSelect
              lang={lang}
              name="workArrangement"
              label={t(lang, "workArrangement")}
              options={WORK_ARRANGEMENTS}
              value={job.workArrangement ?? ""}
            />
            <AttributeSelect
              lang={lang}
              name="engagement"
              label={t(lang, "engagement")}
              options={ENGAGEMENTS}
              value={job.engagement ?? ""}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={t(lang, "followUp")} summary={followSummary}>
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
            <label className="shrink-0">
              <span className={compactLabelClass}>{t(lang, "interestDate")}</span>
              <DateField name="interestDate" defaultValue={dateInputValue(job.interestDate, user.timezone)} required compact lang={lang} />
            </label>
            <DateTimeField
              name="followUpAt"
              defaultValue={job.followUpAt ? dateTimeInputValue(job.followUpAt, user.timezone) : ""}
              lang={lang}
              compact
              clearable
              dateLabel={t(lang, "followUp")}
            />
            <div className="flex items-end gap-2">
              <span className="pb-1 text-xs font-medium text-slate-100">{t(lang, "reminderLead")}</span>
              <label className="shrink-0">
                <span className={compactLabelClass}>{t(lang, "days")}</span>
                <input className={reminderFieldClass} name="reminderLeadDays" defaultValue={job.reminderLeadDays ?? ""} inputMode="numeric" />
              </label>
              <label className="shrink-0">
                <span className={compactLabelClass}>{t(lang, "hours")}</span>
                <input className={reminderFieldClass} name="reminderLeadHours" defaultValue={job.reminderLeadHours ?? ""} inputMode="numeric" />
              </label>
              <p className="max-w-[16rem] pb-1 text-[11px] italic leading-snug text-slate-500">{t(lang, "reminderBlank")}</p>
            </div>
            <div className="ms-auto">
              <SubmitButton label={t(lang, "save")} />
            </div>
            <label className="min-w-0 basis-full">
              <span className={compactLabelClass}>{t(lang, "followUpNote")}</span>
              <input className={compactFieldClass} name="followUpNote" defaultValue={job.followUpNote} />
            </label>
          </div>
        </SettingsSection>
      </form>

      <RelatedByTags
        className=""
        showCount
        lang={lang}
        hide={hide}
        hasTags={jobTagIds.length > 0}
        jobs={relatedJobs}
        employments={relatedEmployments}
        notes={relatedNotes}
        contacts={relatedContacts}
      />

      <JobPeopleSection
        lang={lang}
        hide={hide}
        jobId={job.id}
        links={job.entityLinks.map((link) => ({
          id: link.id,
          kind: link.kind,
          displayName: link.displayName,
          title: link.title,
          googleResourceName: link.googleResourceName,
          url: link.url,
          contactId: link.contactId,
          firstName: link.firstName,
          lastName: link.lastName,
          phone: link.phone,
          email: link.email,
          worksThere: link.worksThere,
          connection: link.connection,
          relationshipNote: link.relationshipNote,
        }))}
        localContacts={localContacts}
        googleConnected={googleConnected}
      />

      <SettingsSection title={t(lang, "urls")} badge={String(job.urls.length)}>
        <JobUrlsEditor lang={lang} initialUrls={job.urls} form="job-form" hideLabel />
      </SettingsSection>

      <SettingsSection title={t(lang, "cvCount")} badge={job.cvs.length ? String(job.cvs.length) : undefined}>
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
      </SettingsSection>

      <SettingsSection title={t(lang, "history")} badge={job.events.length ? String(job.events.length) : undefined}>
        <EventHistoryTable
          lang={lang}
          timezone={user.timezone}
          hide={hide}
          events={job.events}
          editHref={`/events?modal=edit&eventId={id}&returnTo=${encodeURIComponent(jobReturn)}`}
          returnTo={jobReturn}
          liveJobId={job.id}
        />
      </SettingsSection>
      <div>
        <form action={deleteJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
        </form>
      </div>
    </PageFrame>
  );
}
