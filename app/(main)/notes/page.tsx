import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { createNote } from "@/lib/actions/network";
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

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
  const notes = await prisma.note.findMany({
    where: {
      userId: user.id,
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <PageFrame lang={lang} title={t(lang, "notes")} description={t(lang, "notesIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{t(lang, "notes")}</h2>
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/notes${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addNote")}
        </Link>
      </div>
      <form className="mb-4" method="get">
        <fieldset className="rounded-lg border border-slate-700 p-3">
          <legend className="px-1 text-sm">{t(lang, "filters")}</legend>
          <label>
            <span className={labelClass}>{t(lang, "search")}</span>
            <input className={fieldClass} name="q" defaultValue={q} />
          </label>
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">{t(lang, "apply")}</button>
        </fieldset>
      </form>
      {notes.length === 0 ? (
        <EmptyState>{t(lang, "emptyNotes")}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
              <Link className="text-sky-300" href={`/notes/${note.id}`}>{dash(note.title, hide)}</Link>
              <span className="ms-2 text-slate-400">{t(lang, "version")} {note.versions[0]?.version ?? 1}</span>
            </li>
          ))}
        </ul>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addNote")} closeHref={`/notes${preserveQuery(search, {}, ["modal"])}`} closeLabel={t(lang, "close")}>
          <form action={createNote} className="grid gap-3">
            <label><span className={labelClass}>{t(lang, "title")}</span><input className={fieldClass} name="title" required /></label>
            <label><span className={labelClass}>{t(lang, "bodyEn")}</span><textarea className={fieldClass} name="bodyEn" rows={5} /></label>
            <label><span className={labelClass}>{t(lang, "bodyHe")}</span><textarea className={fieldClass} name="bodyHe" rows={5} /></label>
            <SubmitButton label={t(lang, "save")} />
          </form>
        </Modal>
      ) : null}
    </PageFrame>
  );
}
