"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  companies = [],
  initialSubject: presetSubject = "",
  localContacts = [],
  googleConnected = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  note?: Pick<Note, "id" | "title" | "jobId" | "contactId" | "companyId" | "type" | "additionalInfo" | "bodyEn" | "bodyHe">;
  jobs: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  companies?: { id: string; label: string }[];
  initialSubject?: string;
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
}) {
  const initialSubject = note ? subjectValue(note) : presetSubject;
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
      <input type="hidden" name="subject" value={subject} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SearchSelect
          label={t(lang, "job")}
          options={jobs}
          value={subjectId(subject, "job")}
          emptyLabel={t(lang, "none")}
          searchLabel={t(lang, "search")}
          onChange={(id) => onSubject(id ? `job:${id}` : "")}
        />
        <SearchSelect
          label={t(lang, "contact")}
          options={contacts}
          value={subjectId(subject, "contact")}
          emptyLabel={t(lang, "none")}
          searchLabel={t(lang, "search")}
          onChange={(id) => onSubject(id ? `contact:${id}` : "")}
        />
        <SearchSelect
          label={t(lang, "company")}
          options={companies}
          value={subjectId(subject, "company")}
          emptyLabel={t(lang, "none")}
          searchLabel={t(lang, "search")}
          onChange={(id) => onSubject(id ? `company:${id}` : "")}
        />
      </div>
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

function subjectId(subject: string, kind: "job" | "contact" | "company"): string {
  const prefix = `${kind}:`;
  return subject.startsWith(prefix) ? subject.slice(prefix.length) : "";
}

function SearchSelect({
  label,
  options,
  value,
  emptyLabel,
  searchLabel,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  emptyLabel: string;
  searchLabel: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={`relative min-w-0 ${open ? "z-20" : ""}`} ref={root}>
      <span className={labelClass}>{label}</span>
      <button
        className={`${fieldClass} truncate text-start`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
      >
        {selected?.label || emptyLabel}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg">
          <input
            className={fieldClass}
            value={query}
            placeholder={searchLabel}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
              if (event.key === "Escape") setOpen(false);
            }}
          />
          <ul className="mt-2 max-h-48 overflow-auto" role="listbox">
            <li>
              <button className="w-full rounded px-2 py-1 text-start text-sm text-slate-300 hover:bg-slate-800" type="button" onClick={() => choose("")}>
                {emptyLabel}
              </button>
            </li>
            {shown.map((option) => (
              <li key={option.id}>
                <button
                  className={`w-full rounded px-2 py-1 text-start text-sm hover:bg-slate-800 ${option.id === value ? "bg-slate-800 text-sky-200" : ""}`}
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onClick={() => choose(option.id)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
