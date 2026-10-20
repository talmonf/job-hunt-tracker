"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@prisma/client";
import { noteTypesFor, subjectKind, subjectValue, type NoteSubjectKind } from "@/lib/notes";
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
  employments = [],
  initialSubject: presetSubject = "",
  localContacts = [],
  googleConnected = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  note?: Pick<Note, "id" | "title" | "jobId" | "contactId" | "companyId" | "employmentId" | "type" | "additionalInfo" | "bodyEn" | "bodyHe">;
  jobs: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  companies?: { id: string; label: string }[];
  employments?: { id: string; label: string }[];
  initialSubject?: string;
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
}) {
  const initialSubject = note ? subjectValue(note) : presetSubject;
  const initialKind = subjectKind(initialSubject);
  const initialTypes = noteTypesFor(initialKind);
  const [kind, setKind] = useState<NoteSubjectKind>(initialKind);
  const [subject, setSubject] = useState(initialSubject);
  const [type, setType] = useState(
    note && (initialTypes as readonly string[]).includes(note.type) ? note.type : initialTypes[0],
  );
  const types = noteTypesFor(kind);
  const entityKind = kind === "general" ? null : kind;
  const entityOptions =
    entityKind === "job" ? jobs : entityKind === "contact" ? contacts : entityKind === "company" ? companies : employments;
  const entityValue = entityKind ? subjectId(subject, entityKind) : "";
  const entityLabel =
    entityKind === "job"
      ? t(lang, "job")
      : entityKind === "contact"
        ? t(lang, "contact")
        : entityKind === "company"
          ? t(lang, "company")
          : t(lang, "profileRole");

  function onKind(next: NoteSubjectKind) {
    setKind(next);
    const nextTypes = noteTypesFor(next);
    setType((current) => ((nextTypes as readonly string[]).includes(current) ? current : nextTypes[0]));
    if (next === "general" || subjectKind(subject) !== next) setSubject("");
  }

  function onEntity(id: string) {
    if (!entityKind) return;
    setSubject(id ? `${entityKind}:${id}` : "");
  }

  return (
    <form action={action} className="grid gap-3">
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
      <input type="hidden" name="subject" value={subject} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-fit max-w-full">
          <span className={labelClass}>{t(lang, "noteAbout")}</span>
          <select
            className="w-48 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500"
            value={kind}
            onChange={(event) => onKind(event.target.value as NoteSubjectKind)}
          >
            <option value="general">{t(lang, "generalNote")}</option>
            <option value="job">{t(lang, "job")}</option>
            <option value="contact">{t(lang, "contact")}</option>
            <option value="company">{t(lang, "company")}</option>
            <option value="employment">{t(lang, "profileRole")}</option>
          </select>
        </label>
        {entityKind ? (
          <div className="w-full min-w-[12rem] max-w-sm">
            <SearchSelect
              label={entityLabel}
              bare
              options={entityOptions}
              value={entityValue}
              emptyLabel={t(lang, "none")}
              searchLabel={t(lang, "search")}
              onChange={onEntity}
            />
          </div>
        ) : (
          <p className="pb-1.5 text-[11px] italic text-slate-500">{t(lang, "noteAboutGeneral")}</p>
        )}
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
      <SubmitButton label={t(lang, "save")} disabled={kind !== "general" && !entityValue} />
    </form>
  );
}

function subjectId(subject: string, kind: "job" | "contact" | "company" | "employment"): string {
  const prefix = `${kind}:`;
  return subject.startsWith(prefix) ? subject.slice(prefix.length) : "";
}

function SearchSelect({
  label,
  bare = false,
  options,
  value,
  emptyLabel,
  searchLabel,
  onChange,
}: {
  label: string;
  bare?: boolean;
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
      {bare ? null : <span className={labelClass}>{label}</span>}
      <button
        className={`${fieldClass} truncate text-start`}
        type="button"
        aria-label={bare ? `${label}: ${selected?.label || emptyLabel}` : undefined}
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
