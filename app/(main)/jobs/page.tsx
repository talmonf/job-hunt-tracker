import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { allParams, firstParam, preserveQuery } from "@/lib/http";
import { parseDateOnly } from "@/lib/forms";
import { JOB_STATUSES, statusesForJobList } from "@/lib/events";
import { statusLabel, t, type Lang } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { formatDate, formatDateTime } from "@/lib/dates";
import { createJob } from "@/lib/actions/jobs";
import { EmptyState, Modal, PageFrame, statusClass } from "@/components/chrome";
import { DateField, DateTimeField, MultiSelect, SubmitButton, compactFieldClass, compactLabelClass, fieldClass, labelClass } from "@/components/widgets";
import { JobUrlsEditor } from "@/components/job-urls";
import { MentionTextarea } from "@/components/mention-textarea";

export const dynamic = "force-dynamic";

const SORTS = ["companyName", "title", "status", "interestDate", "followUpAt"] as const;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const q = firstParam(search.q);
  const requestedStatuses = allParams(search.status);
  const statuses = statusesForJobList(requestedStatuses);
  const sort = SORTS.includes(firstParam(search.sort) as (typeof SORTS)[number]) ? (firstParam(search.sort) as (typeof SORTS)[number]) : "followUpAt";
  const dir = firstParam(search.dir) === "desc" ? "desc" : "asc";
  const interestFrom = parseDateOnly(firstParam(search.interestFrom), user.timezone);
  const interestTo = parseDateOnly(firstParam(search.interestTo) ? `${firstParam(search.interestTo)}T23:59` : "", user.timezone);
  const followFrom = parseDateOnly(firstParam(search.followFrom), user.timezone);
  const followTo = parseDateOnly(firstParam(search.followTo) ? `${firstParam(search.followTo)}T23:59` : "", user.timezone);
  const where: Prisma.JobWhereInput = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    status: { in: statuses },
    ...(interestFrom || interestTo ? { interestDate: { gte: interestFrom ?? undefined, lte: interestTo ?? undefined } } : {}),
    ...(followFrom || followTo ? { followUpAt: { gte: followFrom ?? undefined, lte: followTo ?? undefined } } : {}),
  };
  const [jobs, contacts] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { [sort]: dir },
      include: { _count: { select: { urls: true, cvs: true } } },
    }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
  ]);
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  const googleConnected = Boolean(user.contactsRefreshToken);
  const keep = preserveQuery(search, {}, ["modal"]);
  const closeHref = `/jobs${preserveQuery(search, {}, ["modal"])}`;
  const today = new Date();
  const interestDefault = formatDate(today, user.timezone).split("/").reverse().join("-");
  const followDefaultDate = new Date(today.getTime() + 7 * 86400000);
  const followDefault = `${formatDate(followDefaultDate, user.timezone).split("/").reverse().join("-")}T09:00`;

  return (
    <PageFrame lang={lang} title={t(lang, "jobs")} description={t(lang, "jobsIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t(lang, "jobs")}</h2>
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/jobs${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addJob")}
        </Link>
      </div>
      <form className="mb-2 rounded-md border border-slate-700 px-2 py-1" method="get">
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-label={t(lang, "filters")}>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          {["created", "updated", "error", "warn"].map((key) =>
            firstParam(search[key]) ? <input key={key} type="hidden" name={key} value={firstParam(search[key])} /> : null,
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_9.5rem_auto] items-end gap-x-2 gap-y-1">
            <label className="min-w-0">
              <span className={compactLabelClass}>{t(lang, "search")}</span>
              <input className={compactFieldClass} name="q" defaultValue={q} placeholder={t(lang, "nameOrCompany")} />
            </label>
            <div className="min-w-0">
              <span className={compactLabelClass}>{t(lang, "status")}</span>
              <MultiSelect
                compact
                name="status"
                selected={requestedStatuses.filter((status) => (JOB_STATUSES as readonly string[]).includes(status))}
                anyLabel={t(lang, "any")}
                selectAll={t(lang, "selectAll")}
                deselectAll={t(lang, "deselectAll")}
                done={t(lang, "done")}
                selectedWord={t(lang, "selectedCount")}
                options={JOB_STATUSES.map((status) => ({ value: status, label: statusLabel(lang, status) }))}
              />
            </div>
            <DateRange
              label={t(lang, "interestDate")}
              fromName="interestFrom"
              toName="interestTo"
              fromValue={firstParam(search.interestFrom)}
              toValue={firstParam(search.interestTo)}
              lang={lang}
            />
            <DateRange
              label={t(lang, "followUp")}
              fromName="followFrom"
              toName="followTo"
              fromValue={firstParam(search.followFrom)}
              toValue={firstParam(search.followTo)}
              lang={lang}
            />
            <div aria-hidden />
            <div className="flex justify-end">
              <button className="rounded bg-sky-500 px-2 py-0.5 text-xs font-semibold leading-tight text-slate-950" type="submit">
                {t(lang, "apply")}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
      {jobs.length === 0 ? (
        <EmptyState>{t(lang, "emptyJobs")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <SortHead label={t(lang, "company")} column="companyName" sort={sort} dir={dir} search={search} />
                <SortHead label={t(lang, "title")} column="title" sort={sort} dir={dir} search={search} />
                <SortHead label={t(lang, "status")} column="status" sort={sort} dir={dir} search={search} />
                <SortHead label={t(lang, "interestDate")} column="interestDate" sort={sort} dir={dir} search={search} />
                <SortHead label={t(lang, "followUp")} column="followUpAt" sort={sort} dir={dir} search={search} />
                <th className="px-3 py-2">{t(lang, "urlCount")}</th>
                <th className="px-3 py-2">{t(lang, "cvCount")}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <Link className="text-sky-300" href={`/jobs/${job.id}`}>
                      {dash(job.companyName, hide)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{dash(job.title, hide)}</td>
                  <td className={`px-3 py-2 ${statusClass(job.status)}`}>{statusLabel(lang, job.status)}</td>
                  <td className="px-3 py-2">{formatDate(job.interestDate, user.timezone)}</td>
                  <td className="px-3 py-2">{job.followUpAt ? formatDateTime(job.followUpAt, user.timezone) : "—"}</td>
                  <td className="px-3 py-2">{job._count.urls}</td>
                  <td className="px-3 py-2">{job._count.cvs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addJob")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <form action={createJob} className="grid gap-3">
            <input type="hidden" name="returnTo" value={`/jobs${keep}`} />
            <label>
              <span className={labelClass}>{t(lang, "company")}</span>
              <input className={fieldClass} name="companyName" required />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "title")}</span>
              <input className={fieldClass} name="title" />
            </label>
            <MentionTextarea
              lang={lang}
              name="description"
              label={t(lang, "description")}
              rows={4}
              localContacts={localContacts}
              googleConnected={googleConnected}
              allowUrl={false}
            />
            <JobUrlsEditor lang={lang} />
            <div>
              <span className={labelClass}>{t(lang, "interestDate")}</span>
              <DateField name="interestDate" defaultValue={interestDefault} required lang={lang} />
            </div>
            <div>
              <span className={labelClass}>{t(lang, "followUp")}</span>
              <DateTimeField name="followUpAt" defaultValue={followDefault} lang={lang} />
              <span className="mt-1 block text-xs text-slate-400">{t(lang, "followUpHelp")}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>{t(lang, "days")}</span>
                <input className={fieldClass} name="reminderLeadDays" inputMode="numeric" />
              </label>
              <label>
                <span className={labelClass}>{t(lang, "hours")}</span>
                <input className={fieldClass} name="reminderLeadHours" inputMode="numeric" />
              </label>
            </div>
            <p className="text-xs text-slate-400">{t(lang, "reminderBlank")}</p>
            <SubmitButton label={t(lang, "save")} />
          </form>
        </Modal>
      ) : null}
    </PageFrame>
  );
}

function DateRange({
  label,
  fromName,
  toName,
  fromValue,
  toValue,
  lang,
}: {
  label: string;
  fromName: string;
  toName: string;
  fromValue: string;
  toValue: string;
  lang: Lang;
}) {
  return (
    <div className="w-fit">
      <span className={compactLabelClass}>{label}</span>
      <div className="flex items-center gap-1">
        <div className="w-[7.25rem]">
          <DateField compact name={fromName} defaultValue={fromValue} lang={lang} />
        </div>
        <span className="text-[11px] leading-none text-slate-500" aria-hidden>
          –
        </span>
        <div className="w-[7.25rem]">
          <DateField compact name={toName} defaultValue={toValue} lang={lang} />
        </div>
      </div>
    </div>
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
  const href = `/jobs${preserveQuery(search, { sort: column, dir: nextDir }, ["modal", "created", "updated", "error", "warn"])}`;
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
