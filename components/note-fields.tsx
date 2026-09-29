import type { Note } from "@prisma/client";
import { NOTE_TYPES } from "@/lib/notes";
import { noteTypeLabel, t } from "@/lib/i18n";
import { SubmitButton, fieldClass, labelClass } from "./widgets";

export function NoteFields({
  lang,
  action,
  note,
  jobs,
}: {
  lang: "en" | "he";
  action: (formData: FormData) => void;
  note?: Pick<Note, "id" | "title" | "jobId" | "type" | "additionalInfo" | "bodyEn" | "bodyHe">;
  jobs: { id: string; label: string }[];
}) {
  return (
    <form action={action} className="grid gap-3">
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
      <label>
        <span className={labelClass}>{t(lang, "title")}</span>
        <input className={fieldClass} name="title" defaultValue={note?.title ?? ""} required />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "jobs")}</span>
        <select className={fieldClass} name="jobId" defaultValue={note?.jobId ?? ""}>
          <option value="">{t(lang, "none")}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>{t(lang, "noteType")}</span>
        <select className={fieldClass} name="type" defaultValue={note?.type ?? "interview_prep"}>
          {NOTE_TYPES.map((type) => (
            <option key={type} value={type}>
              {noteTypeLabel(lang, type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>{t(lang, "additionalInfo")}</span>
        <textarea className={fieldClass} name="additionalInfo" rows={3} defaultValue={note?.additionalInfo ?? ""} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "bodyEn")}</span>
        <textarea className={fieldClass} name="bodyEn" rows={5} defaultValue={note?.bodyEn ?? ""} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "bodyHe")}</span>
        <textarea className={fieldClass} name="bodyHe" rows={5} defaultValue={note?.bodyHe ?? ""} />
      </label>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}

export function jobNoteLabel(job: { companyName: string; title: string }): string {
  return `${job.companyName}${job.title ? ` — ${job.title}` : ""}`;
}
