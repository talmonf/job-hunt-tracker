"use client";

import { useState } from "react";
import type { Note } from "@prisma/client";
import { noteTypesFor, subjectKind, subjectValue } from "@/lib/notes";
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
  contacts,
  localContacts = [],
  googleConnected = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  note?: Pick<Note, "id" | "title" | "jobId" | "contactId" | "type" | "additionalInfo" | "bodyEn" | "bodyHe">;
  jobs: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
}) {
  const initialSubject = note ? subjectValue(note) : "";
  const initialTypes = noteTypesFor(subjectKind(initialSubject));
  const [subject, setSubject] = useState(initialSubject);
  const [type, setType] = useState(
    note && (initialTypes as readonly string[]).includes(note.type) ? note.type : initialTypes[0],
  );
  const types = noteTypesFor(subjectKind(subject));

  function onSubject(next: string) {
    setSubject(next);
    const nextTypes = noteTypesFor(subjectKind(next));
    if (!(nextTypes as readonly string[]).includes(type)) setType(nextTypes[0]);
  }

  return (
    <form action={action} className="grid gap-3">
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
      <label>
        <span className={labelClass}>{t(lang, "noteFor")}</span>
        <select className={fieldClass} name="subject" value={subject} onChange={(event) => onSubject(event.target.value)}>
          <option value="">{t(lang, "generalNote")}</option>
          <optgroup label={t(lang, "jobs")}>
            {jobs.map((job) => (
              <option key={job.id} value={`job:${job.id}`}>
                {job.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={t(lang, "networking")}>
            {contacts.map((contact) => (
              <option key={contact.id} value={`contact:${contact.id}`}>
                {contact.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label>
        <span className={labelClass}>{t(lang, "title")}</span>
        <input className={fieldClass} name="title" defaultValue={note?.title ?? ""} required />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "noteType")}</span>
        <select className={fieldClass} name="type" value={type} onChange={(event) => setType(event.target.value as Note["type"])}>
          {types.map((item) => (
            <option key={item} value={item}>
              {noteTypeLabel(lang, item)}
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
