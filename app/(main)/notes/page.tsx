import Link from "next/link";
import type { NoteType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { allParams, firstParam, preserveQuery } from "@/lib/http";
import { cloneNote, createNote, deleteNote } from "@/lib/actions/network";
import { NOTE_TYPES, jobNoteLabel } from "@/lib/notes";
import { noteTypeLabel, t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { EmptyState, FilterBar, Modal, PageFrame } from "@/components/chrome";
import { ConfirmSubmit, MultiSelect, compactFieldClass, compactLabelClass } from "@/components/widgets";
import { NoteFields } from "@/components/note-fields";
import { TagChips } from "@/components/tag-chip";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const q = firstParam(search.q);
  const types = allParams(search.type).filter((type): type is NoteType =>
    (NOTE_TYPES as readonly string[]).includes(type),
  );
  const [catalog, jobs, contacts, companies] = await Promise.all([
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const tagIds = allParams(search.tag).filter((id) => catalog.some((tag) => tag.id === id));
  const requestedJob = firstParam(search.job);
  const requestedContact = firstParam(search.contact);
  const requestedCompany = firstParam(search.company);
  const jobId = jobs.some((job) => job.id === requestedJob) ? requestedJob : "";
  const contactId = contacts.some((contact) => contact.id === requestedContact) ? requestedContact : "";
  const companyId = companies.some((company) => company.id === requestedCompany) ? requestedCompany : "";
  const and: Prisma.NoteWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { additionalInfo: { contains: q, mode: "insensitive" } },
        { bodyEn: { contains: q, mode: "insensitive" } },
        { bodyHe: { contains: q, mode: "insensitive" } },
        { job: { companyName: { contains: q, mode: "insensitive" } } },
        { job: { title: { contains: q, mode: "insensitive" } } },
        { contact: { fullName: { contains: q, mode: "insensitive" } } },
        { contact: { firstName: { contains: q, mode: "insensitive" } } },
        { contact: { lastName: { contains: q, mode: "insensitive" } } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (companyId) and.push({ OR: [{ companyId }, { job: { companyId } }] });
  const where: Prisma.NoteWhereInput = {
    userId: user.id,
    ...(tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
    ...(types.length ? { type: { in: types } } : {}),
    ...(jobId ? { jobId } : {}),
    ...(contactId ? { contactId } : {}),
    ...(and.length ? { AND: and } : {}),
  };
  const notes = await prisma.note.findMany({
    where,
    include: { job: true, contact: true, company: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  const googleConnected = Boolean(user.contactsRefreshToken);
  const jobOptions = jobs.map((job) => ({ id: job.id, label: dash(jobNoteLabel(job), hide) }));
  const contactOptions = contacts.map((contact) => ({ id: contact.id, label: dash(contact.fullName, hide) }));
  const companyOptions = companies.map((company) => ({ id: company.id, label: dash(company.name, hide) }));
  return (
    <PageFrame lang={lang} title={t(lang, "notes")} description={t(lang, "notesIntro")} search={search}>
      <div className="mb-3 flex justify-end">
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/notes${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addNote")}
        </Link>
      </div>
      <FilterBar className="mb-4" legend={t(lang, "filters")}>
        <div className="grid gap-2 md:grid-cols-3">
          <label>
            <span className={compactLabelClass}>{t(lang, "search")}</span>
            <input className={compactFieldClass} name="q" defaultValue={q} />
          </label>
          {catalog.length ? (
            <div>
              <span className={compactLabelClass}>{t(lang, "tags")}</span>
              <MultiSelect
                compact
                name="tag"
                selected={tagIds}
                anyLabel={t(lang, "any")}
                selectAll={t(lang, "selectAll")}
                deselectAll={t(lang, "deselectAll")}
                done={t(lang, "done")}
                selectedWord={t(lang, "selectedCount")}
                options={catalog.map((tag) => ({ value: tag.id, label: maskText(tag.name, hide) }))}
              />
            </div>
          ) : null}
          <div>
            <span className={compactLabelClass}>{t(lang, "noteType")}</span>
            <MultiSelect
              compact
              name="type"
              selected={types}
              anyLabel={t(lang, "any")}
              selectAll={t(lang, "selectAll")}
              deselectAll={t(lang, "deselectAll")}
              done={t(lang, "done")}
              selectedWord={t(lang, "selectedCount")}
              options={NOTE_TYPES.map((type) => ({ value: type, label: noteTypeLabel(lang, type) }))}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className={compactLabelClass}>{t(lang, "job")}</span>
            <select className={compactFieldClass} name="job" defaultValue={jobId}>
              <option value="">{t(lang, "any")}</option>
              {jobOptions.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className={compactLabelClass}>{t(lang, "contact")}</span>
            <select className={compactFieldClass} name="contact" defaultValue={contactId}>
              <option value="">{t(lang, "any")}</option>
              {contactOptions.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className={compactLabelClass}>{t(lang, "company")}</span>
            <select className={compactFieldClass} name="company" defaultValue={companyId}>
              <option value="">{t(lang, "any")}</option>
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.label}
                </option>
              ))}
            </select>
          </label>
          <button className="ms-auto shrink-0 rounded bg-sky-500 px-2 py-0.5 text-xs font-semibold leading-tight text-slate-950" type="submit">
            {t(lang, "apply")}
          </button>
        </div>
      </FilterBar>
      {notes.length === 0 ? (
        <EmptyState>{t(lang, "emptyNotes")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{t(lang, "title")}</th>
                <th className="px-3 py-2">{t(lang, "tags")}</th>
                <th className="px-3 py-2">{t(lang, "noteFor")}</th>
                <th className="px-3 py-2">{t(lang, "noteType")}</th>
                <th className="px-3 py-2">{t(lang, "additionalInfo")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <Link className="text-sky-300" href={`/notes/${note.id}`}>
                      {dash(note.title, hide)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <TagChips tags={assignmentTags(note.tags)} hide={hide} />
                  </td>
                  <td className="px-3 py-2">
                    {note.job ? (
                      <Link className="text-sky-300" href={`/jobs/${note.job.id}`}>
                        {dash(jobNoteLabel(note.job), hide)}
                      </Link>
                    ) : note.contact ? (
                      <Link className="text-sky-300" href={`/contacts/${note.contact.id}`}>
                        {dash(note.contact.fullName, hide)}
                      </Link>
                    ) : note.company ? (
                      <Link className="text-sky-300" href={`/companies/${note.company.id}`}>
                        {dash(note.company.name, hide)}
                      </Link>
                    ) : (
                      t(lang, "generalNote")
                    )}
                  </td>
                  <td className="px-3 py-2">{noteTypeLabel(lang, note.type)}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-300">{dash(note.additionalInfo, hide)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-3 whitespace-nowrap">
                      <Link className="text-sky-300" href={`/notes/${note.id}`}>
                        {t(lang, "edit")}
                      </Link>
                      <form action={cloneNote}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <button className="text-sky-300" type="submit">
                          {t(lang, "clone")}
                        </button>
                      </form>
                      <ConfirmSubmit
                        action={deleteNote}
                        message={t(lang, "deleteConfirm")}
                        label={t(lang, "delete")}
                        className="text-rose-300"
                      >
                        <input type="hidden" name="noteId" value={note.id} />
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
        <Modal title={t(lang, "addNote")} closeHref={`/notes${preserveQuery(search, {}, ["modal"])}`} closeLabel={t(lang, "close")}>
          <NoteFields lang={lang} action={createNote} jobs={jobOptions} contacts={contactOptions} companies={companyOptions} localContacts={localContacts} googleConnected={googleConnected} tags={catalog} hide={hide} />
        </Modal>
      ) : null}
    </PageFrame>
  );
}
