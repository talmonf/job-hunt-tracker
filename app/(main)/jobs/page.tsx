import Link from "next/link";
import type { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { allParams, firstParam, preserveQuery } from "@/lib/http";
import { parseDateOnly } from "@/lib/forms";
import { JOB_STATUSES } from "@/lib/events";
import { statusLabel, t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { formatDate, formatDateTime } from "@/lib/dates";
import { createJob } from "@/lib/actions/jobs";
import { EmptyState, Modal, PageFrame, statusClass } from "@/components/chrome";
import { DateField, DateTimeField, MultiSelect, SubmitButton, fieldClass, labelClass } from "@/components/widgets";

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
  const statuses = allParams(search.status).filter((status): status is JobStatus =>
    (JOB_STATUSES as readonly string[]).includes(status),
  );
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
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(interestFrom || interestTo ? { interestDate: { gte: interestFrom ?? undefined, lte: interestTo ?? undefined } } : {}),
    ...(followFrom || followTo ? { followUpAt: { gte: followFrom ?? undefined, lte: followTo ?? undefined } } : {}),
  };
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { [sort]: dir },
    include: { _count: { select: { urls: true, cvs: true } } },
  });
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
              <input className={fieldClass} name="q" defaultValue={q} placeholder={t(lang, "nameOrCompany")} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "status")}</span>
              <MultiSelect
                name="status"
                selected={statuses}
                anyLabel={t(lang, "any")}
                selectAll={t(lang, "selectAll")}
                deselectAll={t(lang, "deselectAll")}
                done={t(lang, "done")}
                selectedWord={t(lang, "selectedCount")}
                options={JOB_STATUSES.map((status) => ({ value: status, label: statusLabel(lang, status) }))}
              />
            </label>
            <div />
            <label>
              <span className={labelClass}>{t(lang, "interestDate")} {t(lang, "from")}</span>
              <DateField name="interestFrom" defaultValue={firstParam(search.interestFrom)} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "to")}</span>
              <DateField name="interestTo" defaultValue={firstParam(search.interestTo)} />
            </label>
            <div />
            <label>
              <span className={labelClass}>{t(lang, "followUp")} {t(lang, "from")}</span>
              <DateField name="followFrom" defaultValue={firstParam(search.followFrom)} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "to")}</span>
              <DateField name="followTo" defaultValue={firstParam(search.followTo)} />
            </label>
          </div>
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">
            {t(lang, "apply")}
          </button>
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
                  <td className="px-3 py-2">{formatDateTime(job.followUpAt, user.timezone)}</td>
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
            <label>
              <span className={labelClass}>{t(lang, "description")}</span>
              <textarea className={fieldClass} name="description" rows={4} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "urls")}</span>
              <input className={fieldClass} name="url1" placeholder="https://" />
            </label>
            <input className={fieldClass} name="url2" placeholder="https://" />
            <input className={fieldClass} name="url3" placeholder="https://" />
            <label>
              <span className={labelClass}>{t(lang, "interestDate")}</span>
              <DateField name="interestDate" defaultValue={interestDefault} required />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "followUp")}</span>
              <DateTimeField name="followUpAt" defaultValue={followDefault} required />
              <span className="mt-1 block text-xs text-slate-400">{t(lang, "followUpHelp")}</span>
            </label>
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
