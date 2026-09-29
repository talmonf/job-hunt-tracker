"use client";

import { useTransition } from "react";
import { patchContact } from "@/lib/actions/network";
import { CONTACT_STATUSES, isContactStatus, normalizeContactStatus } from "@/lib/contact-status";
import { contactStatusLabel, t, type Lang } from "@/lib/i18n";
import { DateField, fieldClass } from "./widgets";

const compactField = `${fieldClass} min-w-[8.5rem] py-1`;

function save(contactId: string, field: string, value: string, start: (fn: () => void) => void) {
  const data = new FormData();
  data.set("contactId", contactId);
  data.set("field", field);
  data.set("value", value);
  start(() => {
    void patchContact(data);
  });
}

export function ContactStatusEditor({
  contactId,
  status,
  lang,
}: {
  contactId: string;
  status: string;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  const canonical = normalizeContactStatus(status);
  const extra = status && !isContactStatus(canonical) ? status : "";
  return (
    <select
      className={compactField}
      aria-label={t(lang, "status")}
      disabled={pending}
      defaultValue={canonical}
      onChange={(event) => save(contactId, "status", event.target.value, start)}
    >
      <option value="">—</option>
      {CONTACT_STATUSES.map((value) => (
        <option key={value} value={value}>
          {contactStatusLabel(lang, value)}
        </option>
      ))}
      {extra ? <option value={extra}>{extra}</option> : null}
    </select>
  );
}

export function ContactDateEditor({
  contactId,
  value,
  lang,
}: {
  contactId: string;
  value: string;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  return (
    <div className={`min-w-[11rem] ${pending ? "opacity-60" : ""}`}>
      <DateField name="nextActionDate" defaultValue={value} lang={lang} onCommit={(iso) => save(contactId, "nextActionDate", iso, start)} />
    </div>
  );
}

export function ContactWillingEditor({
  contactId,
  willing,
  lang,
}: {
  contactId: string;
  willing: boolean;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      className={`${fieldClass} min-w-[5.5rem] py-1`}
      aria-label={t(lang, "willing")}
      disabled={pending}
      defaultValue={willing ? "1" : "0"}
      onChange={(event) => save(contactId, "willingToRecommend", event.target.value, start)}
    >
      <option value="1">{t(lang, "yes")}</option>
      <option value="0">{t(lang, "no")}</option>
    </select>
  );
}
