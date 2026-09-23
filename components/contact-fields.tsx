import { t } from "@/lib/i18n";
import { DateField, SubmitButton, fieldClass, labelClass } from "./widgets";

export function ContactFields({
  lang,
  action,
  contact,
  contactedAt = "",
  nextActionDate = "",
}: {
  lang: "en" | "he";
  action: (formData: FormData) => void;
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
  };
  contactedAt?: string;
  nextActionDate?: string;
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      <label><span className={labelClass}>{t(lang, "fullName")}</span><input className={fieldClass} name="fullName" defaultValue={contact?.fullName ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "role")}</span><input className={fieldClass} name="role" defaultValue={contact?.role ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "workplace")}</span><input className={fieldClass} name="workplace" defaultValue={contact?.workplace ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "howWeMet")}</span><input className={fieldClass} name="howWeMet" defaultValue={contact?.howWeMet ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "channel")}</span><input className={fieldClass} name="lastChannel" defaultValue={contact?.lastChannel ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "status")}</span><input className={fieldClass} name="status" defaultValue={contact?.status ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "contactedAt")}</span><DateField name="contactedAt" defaultValue={contactedAt} /></label>
      <label><span className={labelClass}>{t(lang, "nextActionDate")}</span><DateField name="nextActionDate" defaultValue={nextActionDate} /></label>
      <label className="md:col-span-2"><span className={labelClass}>{t(lang, "nextAction")}</span><input className={fieldClass} name="nextAction" defaultValue={contact?.nextAction ?? ""} /></label>
      <label className="md:col-span-2"><span className={labelClass}>{t(lang, "contactDetails")}</span><textarea className={fieldClass} name="contactDetails" rows={2} defaultValue={contact?.contactDetails ?? ""} /></label>
      <label className="md:col-span-2"><span className={labelClass}>{t(lang, "conversation")}</span><textarea className={fieldClass} name="summary" rows={3} defaultValue={contact?.summary ?? ""} /></label>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="willingToRecommend" value="1" defaultChecked={contact?.willingToRecommend} />
        {t(lang, "willing")}
      </label>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
