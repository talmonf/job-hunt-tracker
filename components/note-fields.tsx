import type { Note } from "@prisma/client";
import { NOTE_TYPES } from "@/lib/notes";
import { noteTypeLabel, t, type Lang } from "@/lib/i18n";
import type { TagRef } from "@/lib/tags";
import { SubmitButton, fieldClass, labelClass } from "./widgets";
import { MentionTextarea } from "./mention-textarea";
import { TagPicker } from "./tag-picker";
import type { LocalPerson } from "./person-picker";

export function NoteFields({
  lang,
  action,
  note,
  jobs,
  localContacts = [],
  googleConnected = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  note?: Pick<Note, "id" | "title" | "jobId" | "type" | "additionalInfo" | "bodyEn" | "bodyHe">;
  jobs: { id: string; label: string }[];
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
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
      <MentionTextarea
        lang={lang}
        name="additionalInfo"
        label={t(lang, "additionalInfo")}
        defaultValue={note?.additionalInfo ?? ""}
        rows={3}
        localContacts={localContacts}
        googleConnected={googleConnected}
      />
      <MentionTextarea
        lang={lang}
        name="bodyEn"
        label={t(lang, "bodyEn")}
        defaultValue={note?.bodyEn ?? ""}
        rows={5}
        localContacts={localContacts}
        googleConnected={googleConnected}
      />
      <MentionTextarea
        lang={lang}
        name="bodyHe"
        label={t(lang, "bodyHe")}
        defaultValue={note?.bodyHe ?? ""}
        rows={5}
        localContacts={localContacts}
        googleConnected={googleConnected}
      />
      <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} />
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}

export function jobNoteLabel(job: { companyName: string; title: string }): string {
  return `${job.companyName}${job.title ? ` — ${job.title}` : ""}`;
}
