"use client";

import { useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { mentionToken, type MentionTarget } from "@/lib/mentions";
import { fieldClass, labelClass } from "./widgets";
import { PersonPicker, type LocalPerson, type PickedPerson } from "./person-picker";

export function MentionTextarea({
  lang,
  name,
  label,
  defaultValue,
  value: controlledValue,
  onValueChange,
  rows = 5,
  localContacts,
  googleConnected,
  allowUrl = true,
}: {
  lang: Lang;
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  rows?: number;
  localContacts: LocalPerson[];
  googleConnected: boolean;
  allowUrl?: boolean;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const text = controlledValue ?? uncontrolled;
  const [mentionOpen, setMentionOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const trigger = useMemo(() => mentionQuery(text, areaRef.current?.selectionStart ?? text.length), [text]);

  function setText(next: string) {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function insert(person: PickedPerson) {
    const target = pickedTarget(person);
    if (!target) return;
    const token = mentionToken(person.displayName, target);
    const el = areaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const current = mentionQuery(text, cursor);
    const from = current ? current.from : cursor;
    const next = `${text.slice(0, from)}${token} ${text.slice(cursor)}`;
    setText(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = from + token.length + 1;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        ref={areaRef}
        className={fieldClass}
        name={name}
        rows={rows}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setMentionOpen(Boolean(mentionQuery(event.target.value, event.target.selectionStart)));
        }}
        onKeyDown={(event) => {
          if (event.key === "@") setMentionOpen(true);
          if (event.key === "Escape") setMentionOpen(false);
        }}
      />
      <p className="mt-1 text-xs text-slate-400">{t(lang, "mentionHint")}</p>
      {mentionOpen || trigger ? (
        <div className="mt-2">
          <PersonPicker
            lang={lang}
            localContacts={filterLocals(localContacts, trigger?.query ?? "")}
            googleConnected={googleConnected}
            allowUrl={allowUrl}
            onPick={insert}
          />
        </div>
      ) : null}
    </label>
  );
}

function mentionQuery(text: string, cursor: number): { from: number; query: string } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s[]*)$/);
  if (!match || match.index === undefined) return null;
  return { from: match.index, query: match[1] };
}

function filterLocals(contacts: LocalPerson[], query: string): LocalPerson[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter((contact) =>
    [contact.fullName, contact.role, contact.workplace ?? ""].join(" ").toLowerCase().includes(q),
  );
}

function pickedTarget(person: PickedPerson): MentionTarget | null {
  if (person.kind === "local_contact" && person.contactId) {
    return { kind: "local_contact", contactId: person.contactId };
  }
  if (person.kind === "google_contact" && person.googleResourceName) {
    return { kind: "google_contact", googleResourceName: person.googleResourceName };
  }
  if ((person.kind === "linkedin" || person.kind === "url") && person.url) {
    return { kind: person.kind, url: person.url };
  }
  return null;
}
