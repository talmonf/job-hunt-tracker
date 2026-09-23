import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { deleteNote, saveNoteVersion } from "@/lib/actions/network";
import { PageFrame } from "@/components/chrome";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const { id } = await params;
  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { events: { include: { job: true, contact: true } } },
      },
    },
  });
  if (!note) notFound();
  const latest = note.versions[0];
  const lang = user.uiLanguage;
  return (
    <PageFrame lang={lang} backHref="/notes" title={dash(note.title, hide)} description={t(lang, "noteDetailIntro")}>
      <form action={saveNoteVersion} className="grid gap-3">
        <input type="hidden" name="noteId" value={note.id} />
        <label>
          <span className={labelClass}>{t(lang, "title")}</span>
          <input className={fieldClass} name="title" defaultValue={note.title} />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "bodyEn")}</span>
          <textarea className={fieldClass} name="bodyEn" rows={6} defaultValue={latest?.bodyEn ?? ""} />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "bodyHe")}</span>
          <textarea className={fieldClass} name="bodyHe" rows={6} defaultValue={latest?.bodyHe ?? ""} />
        </label>
        <SubmitButton label={t(lang, "save")} />
      </form>
      <h2 className="mb-2 mt-8 text-lg">{t(lang, "versions")}</h2>
      <ol className="space-y-3">
        {note.versions.map((version) => (
          <li key={version.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="font-medium">{t(lang, "version")} {version.version} · {formatDateTime(version.createdAt, user.timezone)}</div>
            {version.bodyEn ? <p className="mt-2 whitespace-pre-wrap" dir="ltr">{maskText(version.bodyEn, hide)}</p> : null}
            {version.bodyHe ? <p className="mt-2 whitespace-pre-wrap" dir="rtl">{maskText(version.bodyHe, hide)}</p> : null}
            {version.events.length ? (
              <ul className="mt-2 text-slate-300">
                {version.events.map((event) => (
                  <li key={event.id}>
                    {event.job ? <Link className="text-sky-300" href={`/jobs/${event.jobId}`}>{dash(event.job.companyName, hide)}</Link> : null}
                    {event.contact ? <Link className="text-sky-300" href={`/contacts/${event.contactId}`}>{dash(event.contact.fullName, hide)}</Link> : null}
                    <span className="ms-2">{formatDateTime(event.occurredAt, user.timezone)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      <form action={deleteNote} className="mt-6">
        <input type="hidden" name="noteId" value={note.id} />
        <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
      </form>
    </PageFrame>
  );
}
