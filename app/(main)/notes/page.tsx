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
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { ConfirmSubmit, MultiSelect, fieldClass, labelClass } from "@/components/widgets";
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
  const catalog = await prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  const tagIds = allParams(search.tag).filter((id) => catalog.some((tag) => tag.id === id));
  const where: Prisma.NoteWhereInput = {
    userId: user.id,
    ...(tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
    ...(types.length ? { type: { in: types } } : {}),
    ...(q
      ? {
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
          ],
        }
      : {}),
  };
  const [notes, jobs, contacts] = await Promise.all([
    prisma.note.findMany({
      where,
      include: { job: true, contact: true, tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
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
  const jobOptions = jobs.map((job) => ({ id: job.id, label: dash(jobNoteLabel(job), hide) }));
  const contactOptions = contacts.map((contact) => ({ id: contact.id, label: dash(contact.fullName, hide) }));
  return (
    <PageFrame lang={lang} title={t(lang, "notes")} description={t(lang, "notesIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{t(lang, "notes")}</h2>
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/notes${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addNote")}
        </Link>
      </div>
      <form className="mb-4 rounded-lg border border-slate-700 p-3" method="get">
        <fieldset>
          <legend className="px-1 text-sm">{t(lang, "filters")}</legend>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label>
              <span className={labelClass}>{t(lang, "search")}</span>
              <input className={fieldClass} name="q" defaultValue={q} />
            </label>
            {catalog.length ? (
              <div>
                <span className={labelClass}>{t(lang, "tags")}</span>
                <MultiSelect
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
            <label>
              <span className={labelClass}>{t(lang, "noteType")}</span>
              <MultiSelect
                name="type"
                selected={types}
                anyLabel={t(lang, "any")}
                selectAll={t(lang, "selectAll")}
                deselectAll={t(lang, "deselectAll")}
                done={t(lang, "done")}
                selectedWord={t(lang, "selectedCount")}
                options={NOTE_TYPES.map((type) => ({ value: type, label: noteTypeLabel(lang, type) }))}
              />
            </label>
          </div>
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">
            {t(lang, "apply")}
          </button>
        </fieldset>
      </form>
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
          <NoteFields lang={lang} action={createNote} jobs={jobOptions} contacts={contactOptions} localContacts={localContacts} googleConnected={googleConnected} tags={catalog} hide={hide} />
        </Modal>
      ) : null}
    </PageFrame>
  );
}
