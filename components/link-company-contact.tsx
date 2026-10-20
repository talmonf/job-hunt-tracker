"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { SubmitButton, labelClass } from "./widgets";

const narrowSelectClass =
  "w-64 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500";

export function LinkCompanyContact({
  lang,
  companyId,
  contacts,
  action,
}: {
  lang: Lang;
  companyId: string;
  contacts: { id: string; label: string }[];
  action: (formData: FormData) => void;
}) {
  if (!contacts.length) return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <label className="w-fit max-w-full">
        <span className={labelClass}>{t(lang, "linkExistingContact")}</span>
        <select className={narrowSelectClass} name="contactId" defaultValue="" required>
          <option value="">{t(lang, "none")}</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.label}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton label={t(lang, "link")} thin />
    </form>
  );
}
