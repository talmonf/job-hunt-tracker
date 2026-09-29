import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { cloneNote, deleteNote, updateNote } from "@/lib/actions/network";
import { PageFrame } from "@/components/chrome";
import { ConfirmSubmit } from "@/components/widgets";
import { NoteFields, jobNoteLabel } from "@/components/note-fields";

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
  const [note, jobs] = await Promise.all([
    prisma.note.findFirst({
      where: { id, userId: user.id },
      include: { job: true, events: { orderBy: { occurredAt: "desc" }, include: { job: true, contact: true } } },
    }),
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
  ]);
  if (!note) notFound();
  const lang = user.uiLanguage;
  return (
    <PageFrame lang={lang} backHref="/notes" title={dash(note.title, hide)} description={t(lang, "noteDetailIntro")} search={search}>
      <NoteFields
        lang={lang}
        action={updateNote}
        note={note}
        jobs={jobs.map((job) => ({ id: job.id, label: dash(jobNoteLabel(job), hide) }))}
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
                  <Link className="ms-2 text-sky-300" href={`/contacts/${event.contactId}`}>
                    {dash(event.contact.fullName, hide)}
                  </Link>
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
