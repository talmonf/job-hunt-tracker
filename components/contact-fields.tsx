import { CONTACT_STATUSES, isContactStatus, normalizeContactStatus } from "@/lib/contact-status";
import { contactStatusLabel, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { TagRef } from "@/lib/tags";
import { DateField, SubmitButton, fieldClass, labelClass } from "./widgets";
import { MentionTextarea } from "./mention-textarea";
import { TagPicker } from "./tag-picker";
import type { LocalPerson } from "./person-picker";

export function ContactFields({
  lang,
  action,
  contact,
  contactedAt = "",
  nextActionDate = "",
  localContacts = [],
  googleConnected = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
  contact?: {
    id: string;
    fullName: string;
    role: string;
    workplace: string;
    howWeMet: string;
    lastChannel: string;
    status: string;
    summary: string;
    nextAction: string;
    contactDetails: string;
    willingToRecommend: boolean;
    linkedinUrl?: string;
  };
  contactedAt?: string;
  nextActionDate?: string;
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      <label><span className={labelClass}>{t(lang, "fullName")}</span><input className={fieldClass} name="fullName" defaultValue={contact?.fullName ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "role")}</span><input className={fieldClass} name="role" defaultValue={contact?.role ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "workplace")}</span><input className={fieldClass} name="workplace" defaultValue={contact?.workplace ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "howWeMet")}</span><input className={fieldClass} name="howWeMet" defaultValue={contact?.howWeMet ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "channel")}</span><input className={fieldClass} name="lastChannel" defaultValue={contact?.lastChannel ?? ""} /></label>
      <label>
        <span className={labelClass}>{t(lang, "status")}</span>
        <select className={fieldClass} name="status" defaultValue={normalizeContactStatus(contact?.status ?? "")}>
          <option value="">{t(lang, "none")}</option>
          {CONTACT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {contactStatusLabel(lang, status)}
            </option>
          ))}
          {contact?.status && !isContactStatus(normalizeContactStatus(contact.status)) ? (
            <option value={contact.status}>{contact.status}</option>
          ) : null}
        </select>
      </label>
      <label><span className={labelClass}>{t(lang, "contactedAt")}</span><DateField name="contactedAt" defaultValue={contactedAt} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "nextActionDate")}</span><DateField name="nextActionDate" defaultValue={nextActionDate} lang={lang} /></label>
      <label className="md:col-span-2"><span className={labelClass}>{t(lang, "nextAction")}</span><input className={fieldClass} name="nextAction" defaultValue={contact?.nextAction ?? ""} /></label>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "linkedInUrl")}</span>
        <input className={fieldClass} name="linkedinUrl" defaultValue={contact?.linkedinUrl ?? ""} placeholder="https://www.linkedin.com/in/..." />
      </label>
      <div className="md:col-span-2">
        <MentionTextarea
          lang={lang}
          name="contactDetails"
          label={t(lang, "contactDetails")}
          defaultValue={contact?.contactDetails ?? ""}
          rows={2}
          localContacts={localContacts}
          googleConnected={googleConnected}
          allowUrl={false}
        />
      </div>
      <div className="md:col-span-2">
        <MentionTextarea
          lang={lang}
          name="summary"
          label={t(lang, "conversation")}
          defaultValue={contact?.summary ?? ""}
          rows={3}
          localContacts={localContacts}
          googleConnected={googleConnected}
          allowUrl={false}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="willingToRecommend" value="1" defaultChecked={contact?.willingToRecommend} />
        {t(lang, "willing")}
      </label>
      <div className="md:col-span-2">
        <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} />
      </div>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
