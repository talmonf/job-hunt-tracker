import type { Lang } from "@/lib/i18n";
import { companySizeLabel, t } from "@/lib/i18n";
import { COMPANY_SIZES } from "@/lib/company-size";
import type { TagRef } from "@/lib/tags";
import { SubmitButton, fieldClass, labelClass } from "./widgets";
import { TagPicker } from "./tag-picker";

export function CompanyForm({
  action,
  lang,
  hide,
  tags,
  selectedTagIds = [],
  company,
}: {
  action: (formData: FormData) => void;
  lang: Lang;
  hide: boolean;
  tags: TagRef[];
  selectedTagIds?: string[];
  company?: {
    id: string;
    name: string;
    offices: string;
    websiteHome: string;
    websitePeople: string;
    websiteJobs: string;
    linkedinUrl: string;
    foundedOn: string;
    employeeCount: string | null;
    following: boolean;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {company ? <input type="hidden" name="companyId" value={company.id} /> : null}
      <div className="md:col-span-2">
        <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} compact={Boolean(company)} />
      </div>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "company")}</span>
        <input className={fieldClass} name="name" defaultValue={company?.name ?? ""} required />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "dateFounded")}</span>
        <input className={fieldClass} name="foundedOn" defaultValue={company?.foundedOn ?? ""} dir="ltr" placeholder={t(lang, "partialDateHint")} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "employeeCount")}</span>
        <select className={fieldClass} name="employeeCount" defaultValue={company?.employeeCount ?? ""}>
          <option value="">—</option>
          {COMPANY_SIZES.map((size) => (
            <option key={size} value={size}>
              {companySizeLabel(lang, size)}
            </option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "offices")}</span>
        <input className={fieldClass} name="offices" defaultValue={company?.offices ?? ""} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "websiteHome")}</span>
        <input className={fieldClass} name="websiteHome" defaultValue={company?.websiteHome ?? ""} dir="ltr" />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "websitePeople")}</span>
        <input className={fieldClass} name="websitePeople" defaultValue={company?.websitePeople ?? ""} dir="ltr" />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "websiteJobs")}</span>
        <input className={fieldClass} name="websiteJobs" defaultValue={company?.websiteJobs ?? ""} dir="ltr" />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "companyLinkedIn")}</span>
        <input className={fieldClass} name="linkedinUrl" defaultValue={company?.linkedinUrl ?? ""} dir="ltr" />
      </label>
      {company ? (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="following" value="1" defaultChecked={company.following} />
          {t(lang, "following")}
        </label>
      ) : null}
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
