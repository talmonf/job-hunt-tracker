import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { employmentNoteLabel, jobNoteLabel } from "@/lib/notes";
import { dash } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { cloneNote, deleteNote, updateNote } from "@/lib/actions/network";
import { toChipLink } from "@/lib/entity-links";
import { PageFrame } from "@/components/chrome";
import { ConfirmSubmit } from "@/components/widgets";
import { NoteFields } from "@/components/note-fields";
import { ContactChip } from "@/components/contact-chip";
import { EntityLinksSection } from "@/components/entity-links";
import { MentionText } from "@/components/mention-text";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
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
  const [note, jobs, contacts, companies, employments, catalog] = await Promise.all([
    prisma.note.findFirst({
      where: { id, userId: user.id },
      include: {
        job: true,
        entityLinks: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { occurredAt: "desc" }, include: { job: true, contact: true } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.employment.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!note) notFound();
  const lang = user.uiLanguage;
  const localContacts = contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    role: contact.role,
    workplace: contact.workplace,
    googleResourceName: contact.googleResourceName,
    linkedinUrl: contact.linkedinUrl,
  }));
  const people = note.entityLinks.map(toChipLink);
  const googleConnected = Boolean(user.contactsRefreshToken);
  const lookup = { contacts: localContacts, links: people };
  return (
    <PageFrame lang={lang} backHref="/notes" title={dash(note.title, hide)} description={t(lang, "noteDetailIntro")} search={search}>
      {(note.additionalInfo || note.bodyEn || note.bodyHe) ? (
        <div className="mb-6 space-y-4">
          <h2 className="text-lg">{t(lang, "preview")}</h2>
          {note.additionalInfo ? <MentionText text={note.additionalInfo} hide={hide} lookup={lookup} /> : null}
          {note.bodyEn ? <MentionText text={note.bodyEn} hide={hide} lookup={lookup} /> : null}
          {note.bodyHe ? <MentionText text={note.bodyHe} hide={hide} lookup={lookup} /> : null}
        </div>
      ) : null}
      <NoteFields
        lang={lang}
        action={updateNote}
        note={note}
        jobs={jobs.map((job) => ({ id: job.id, label: dash(jobNoteLabel(job), hide) }))}
        contacts={contacts.map((contact) => ({ id: contact.id, label: dash(contact.fullName, hide) }))}
        companies={companies.map((company) => ({ id: company.id, label: dash(company.name, hide) }))}
        employments={employments.map((row) => ({ id: row.id, label: dash(employmentNoteLabel(row), hide) }))}
        localContacts={localContacts}
        googleConnected={googleConnected}
        tags={catalog}
        selectedTagIds={assignmentTags(note.tags).map((tag) => tag.id)}
        hide={hide}
      />
      <EntityLinksSection
        lang={lang}
        hide={hide}
        links={people}
        noteId={note.id}
        localContacts={localContacts}
        googleConnected={googleConnected}
        allowUrl
      />
      <div className="mt-4 flex flex-wrap gap-4">
        <form action={cloneNote}>
          <input type="hidden" name="noteId" value={note.id} />
          <button className="text-sm text-sky-300" type="submit">
            {t(lang, "clone")}
          </button>
        </form>
        <ConfirmSubmit
          action={deleteNote}
          message={t(lang, "deleteConfirm")}
          label={t(lang, "delete")}
          className="text-sm text-rose-300"
        >
          <input type="hidden" name="noteId" value={note.id} />
        </ConfirmSubmit>
      </div>
      {note.events.length ? (
        <>
          <h2 className="mb-2 mt-8 text-lg">{t(lang, "linkedEvents")}</h2>
          <ul className="space-y-2 text-sm">
            {note.events.map((event) => (
              <li key={event.id} className="rounded-md border border-slate-700 px-3 py-2">
                {event.job ? (
                  <Link className="text-sky-300" href={`/jobs/${event.jobId}`}>
                    {dash(jobNoteLabel(event.job), hide)}
                  </Link>
                ) : null}
                {event.contact ? (
                  <span className="ms-2 inline-block">
                    <ContactChip
                      hide={hide}
                      link={{
                        kind: "local_contact",
                        displayName: event.contact.fullName,
                        title: event.contact.role,
                        contactId: event.contact.id,
                      }}
                    />
                  </span>
                ) : null}
                <span className="ms-2 text-slate-400">{formatDateTime(event.occurredAt, user.timezone)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </PageFrame>
  );
}
