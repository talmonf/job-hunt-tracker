import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam } from "@/lib/http";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { tenureLabel } from "@/lib/tenure";
import { isHttpUrl } from "@/lib/entity-links";
import { deleteCompany, updateCompany } from "@/lib/actions/companies";
import { createNote } from "@/lib/actions/network";
import { employmentNoteLabel, jobNoteLabel } from "@/lib/notes";
import { PageFrame } from "@/components/chrome";
import { CompanyForm } from "@/components/company-form";
import { ConfirmSubmit } from "@/components/widgets";
import { NoteFields } from "@/components/note-fields";

export const dynamic = "force-dynamic";

const TABS = ["jobs", "contacts", "notes"] as const;

export default async function CompanyDetailPage({
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
  const lang = user.uiLanguage;
  const requested = firstParam(search.tab);
  const tab = TABS.includes(requested as (typeof TABS)[number]) ? (requested as (typeof TABS)[number]) : "jobs";
  const [company, companyOptions, jobs, contacts, employments, catalog] = await Promise.all([
    prisma.company.findFirst({
      where: { id, userId: user.id },
      include: {
        jobs: { orderBy: [{ companyName: "asc" }, { title: "asc" }] },
        contacts: { include: { contact: true } },
        notes: { orderBy: { updatedAt: "desc" } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.employment.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!company) notFound();
  const people = [...company.contacts].sort((a, b) => a.contact.fullName.localeCompare(b.contact.fullName));
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  return (
    <PageFrame
      lang={lang}
      backHref="/companies"
      title={dash(company.name, hide)}
      description={t(lang, "companyDetailIntro")}
      search={search}
    >
      <CompanyForm
        action={updateCompany}
        lang={lang}
        hide={hide}
        tags={catalog}
        selectedTagIds={assignmentTags(company.tags).map((tag) => tag.id)}
        company={company}
      />
      <div className="mt-3">
        <ConfirmSubmit action={deleteCompany} message={t(lang, "deleteConfirm")} label={t(lang, "delete")} className="text-sm text-rose-300">
          <input type="hidden" name="companyId" value={company.id} />
        </ConfirmSubmit>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-700">
        {TABS.map((item) => (
          <Link
            key={item}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === item ? "border-sky-400 text-sky-200" : "border-transparent text-slate-300"}`}
            href={`/companies/${company.id}?tab=${item}`}
          >
            {t(lang, item === "contacts" ? "contacts" : item)}
          </Link>
        ))}
      </div>
      {tab === "jobs" ? (
        company.jobs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">—</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {company.jobs.map((job) => (
              <li key={job.id}>
                <Link className="text-sky-300" href={`/jobs/${job.id}`}>
                  {dash(job.title ? `${job.companyName} — ${job.title}` : job.companyName, hide)}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {tab === "contacts" ? (
        people.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">—</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {people.map((row) => {
              const range = tenureLabel(row, { unknown: t(lang, "dateUnknown"), present: t(lang, "present") });
              return (
                <li key={row.contactId}>
                  <Link className="text-sky-300" href={`/contacts/${row.contactId}`}>
                    {dash(row.contact.fullName, hide)}
                  </Link>
                  {row.contact.role ? <span className="text-slate-400"> · {dash(row.contact.role, hide)}</span> : null}
                  {range ? <span className="text-slate-400"> · {range}</span> : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
      {tab === "notes" ? (
        <div className="mt-4 space-y-4">
          {company.notes.length === 0 ? null : (
            <ul className="space-y-2 text-sm">
              {company.notes.map((note) => (
                <li key={note.id}>
                  <Link className="text-sky-300" href={`/notes/${note.id}`}>
                    {dash(note.title, hide)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <NoteFields
            lang={lang}
            action={createNote}
            jobs={jobs.map((job) => ({ id: job.id, label: dash(jobNoteLabel(job), hide) }))}
            contacts={contacts.map((contact) => ({ id: contact.id, label: dash(contact.fullName, hide) }))}
            companies={companyOptions.map((item) => ({ id: item.id, label: dash(item.name, hide) }))}
            employments={employments.map((row) => ({ id: row.id, label: dash(employmentNoteLabel(row), hide) }))}
            initialSubject={`company:${company.id}`}
            localContacts={localContacts}
            googleConnected={Boolean(user.contactsRefreshToken)}
            tags={catalog}
            selectedTagIds={[]}
            hide={hide}
          />
        </div>
      ) : null}
      <CompanyLinks lang={lang} company={company} />
    </PageFrame>
  );
}

function CompanyLinks({
  lang,
  company,
}: {
  lang: "en" | "he";
  company: { websiteHome: string; websitePeople: string; websiteJobs: string; linkedinUrl: string };
}) {
  const rows = [
    [t(lang, "websiteHome"), company.websiteHome],
    [t(lang, "websitePeople"), company.websitePeople],
    [t(lang, "websiteJobs"), company.websiteJobs],
    [t(lang, "companyLinkedIn"), company.linkedinUrl],
  ].filter((row): row is [string, string] => Boolean(row[1].trim()) && isHttpUrl(row[1]));
  if (!rows.length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-3 text-sm">
      {rows.map(([label, url]) => (
        <li key={label}>
          <a className="text-sky-300" href={url} target="_blank" rel="noreferrer">
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
