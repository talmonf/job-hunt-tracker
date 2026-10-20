import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam } from "@/lib/http";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { tenureLabel } from "@/lib/tenure";
import { formatDate } from "@/lib/dates";
import { loadJobFillAccess } from "@/lib/ai/feature-grants";
import { deleteCompany, linkContactToCompany, updateCompany } from "@/lib/actions/companies";
import { createContact, createNote } from "@/lib/actions/network";
import { employmentNoteLabel, jobNoteLabel } from "@/lib/notes";
import { Modal, PageFrame } from "@/components/chrome";
import { CompanyForm } from "@/components/company-form";
import { CompanyTabs } from "@/components/company-tabs";
import { ContactFields } from "@/components/contact-fields";
import { JobCreateForm } from "@/components/job-create-form";
import { LinkCompanyContact } from "@/components/link-company-contact";
import { ConfirmSubmit } from "@/components/widgets";
import { NoteFields } from "@/components/note-fields";

export const dynamic = "force-dynamic";

const TABS = ["details", "jobs", "contacts", "notes"] as const;
const addButton =
  "w-fit self-start rounded-md bg-sky-500 px-2.5 py-0.5 text-sm font-semibold leading-tight text-slate-950 hover:bg-sky-400";

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
  const tab = TABS.includes(requested as (typeof TABS)[number]) ? (requested as (typeof TABS)[number]) : "details";
  const modal = firstParam(search.modal);
  const [company, companyOptions, jobs, contacts, employments, catalog, jobFillAccess] = await Promise.all([
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
    loadJobFillAccess(user.id),
  ]);
  if (!company) notFound();
  const people = [...company.contacts].sort((a, b) => a.contact.fullName.localeCompare(b.contact.fullName));
  const linkedIds = new Set(people.map((row) => row.contactId));
  const linkable = contacts
    .filter((contact) => !linkedIds.has(contact.id))
    .map((contact) => ({ id: contact.id, label: dash(contact.fullName, hide) }));
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  const googleConnected = Boolean(user.contactsRefreshToken);
  const jobsHref = `/companies/${company.id}?tab=jobs`;
  const contactsHref = `/companies/${company.id}?tab=contacts`;
  const today = new Date();
  const interestDefault = formatDate(today, user.timezone).split("/").reverse().join("-");
  const followDefaultDate = new Date(today.getTime() + 7 * 86400000);
  const followDefault = `${formatDate(followDefaultDate, user.timezone).split("/").reverse().join("-")}T09:00`;
  return (
    <PageFrame
      lang={lang}
      backHref="/companies"
      title={dash(company.name, hide)}
      description={t(lang, "companyDetailIntro")}
      search={search}
    >
      <CompanyTabs
        initial={tab}
        tabs={[
          { id: "details", label: t(lang, "detailsSection") },
          { id: "jobs", label: t(lang, "jobs") },
          { id: "contacts", label: t(lang, "contacts") },
          { id: "notes", label: t(lang, "notes") },
        ]}
        panels={{
          details: (
            <>
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
            </>
          ),
          jobs: (
            <div className="space-y-4">
              <Link className={addButton} href={`${jobsHref}&modal=job`}>
                {t(lang, "addJob")}
              </Link>
              {company.jobs.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {company.jobs.map((job) => (
                    <li key={job.id}>
                      <Link className="text-sky-300" href={`/jobs/${job.id}`}>
                        {dash(job.title ? `${job.companyName} — ${job.title}` : job.companyName, hide)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
          contacts: (
            <div className="space-y-4">
              <Link className={addButton} href={`${contactsHref}&modal=contact`}>
                {t(lang, "addContact")}
              </Link>
              <LinkCompanyContact lang={lang} companyId={company.id} contacts={linkable} action={linkContactToCompany} />
              {people.length === 0 ? (
                <p className="text-sm text-slate-400">{t(lang, "noCompanyContacts")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
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
              )}
            </div>
          ),
          notes: (
            <div className="space-y-4">
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
                googleConnected={googleConnected}
                tags={catalog}
                selectedTagIds={[]}
                hide={hide}
                wide
              />
            </div>
          ),
        }}
      />
      {modal === "job" ? (
        <Modal title={t(lang, "addJob")} closeHref={jobsHref} closeLabel={t(lang, "close")}>
          <JobCreateForm
            lang={lang}
            hide={hide}
            returnTo={jobsHref}
            companyName={company.name}
            companyNames={companyOptions.map((item) => item.name)}
            localContacts={localContacts}
            googleConnected={googleConnected}
            jobFillAccess={jobFillAccess}
            interestDate={interestDefault}
            followUpAt={followDefault}
            tags={catalog}
          />
        </Modal>
      ) : null}
      {modal === "contact" ? (
        <Modal title={t(lang, "addContact")} closeHref={contactsHref} closeLabel={t(lang, "close")}>
          <ContactFields
            lang={lang}
            action={createContact}
            localContacts={localContacts}
            googleConnected={googleConnected}
            googleAtStart
            tags={catalog}
            companies={companyOptions}
            selectedCompanies={[{ name: company.name }]}
            hide={hide}
            returnTo={contactsHref}
          />
        </Modal>
      ) : null}
    </PageFrame>
  );
}
