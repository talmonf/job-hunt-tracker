"use client";

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { SubmitButton } from "./widgets";

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
    <div>
      <p className="mb-2 text-sm text-slate-200">{t(lang, "alreadyInNetworking")}</p>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="companyId" value={companyId} />
        <select className={narrowSelectClass} name="contactId" defaultValue="" required aria-label={t(lang, "chooseContact")}>
          <option value="">{t(lang, "chooseContact")}</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.label}
            </option>
          ))}
        </select>
        <SubmitButton label={t(lang, "link")} thin />
      </form>
    </div>
  );
}
