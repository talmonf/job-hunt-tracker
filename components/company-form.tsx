import type { Lang } from "@/lib/i18n";
import { companySizeLabel, t } from "@/lib/i18n";
import { COMPANY_SIZES } from "@/lib/company-size";
import { isHttpUrl } from "@/lib/entity-links";
import type { TagRef } from "@/lib/tags";
import { SubmitButton, fieldClass, labelClass } from "./widgets";
import { TagPicker } from "./tag-picker";

const narrowSelectClass =
  "w-40 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500";
const dateInputClass =
  "w-36 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500";
const inlineLabelClass = "shrink-0 text-xs leading-none text-slate-300";
const hintClass = "text-[11px] italic text-slate-500";

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
    description: string;
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
    <form action={action} className="grid max-w-5xl gap-3">
      {company ? <input type="hidden" name="companyId" value={company.id} /> : null}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className="w-64 max-w-full">
          <span className={labelClass}>{t(lang, "company")}</span>
          <input className={fieldClass} name="name" defaultValue={company?.name ?? ""} required />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <label className="flex items-center gap-2">
            <span className={inlineLabelClass}>{t(lang, "dateFounded")}</span>
            <input className={dateInputClass} name="foundedOn" defaultValue={company?.foundedOn ?? ""} dir="ltr" />
          </label>
          <span className={hintClass}>{t(lang, "partialDateHint")}</span>
        </div>
        <label className="w-fit max-w-full">
          <span className={labelClass}>{t(lang, "employeeCount")}</span>
          <select className={narrowSelectClass} name="employeeCount" defaultValue={company?.employeeCount ?? ""}>
            <option value="">—</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {companySizeLabel(lang, size)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className={labelClass}>{t(lang, "description")}</span>
        <textarea className={fieldClass} name="description" rows={4} defaultValue={company?.description ?? ""} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "offices")}</span>
        <input className={fieldClass} name="offices" defaultValue={company?.offices ?? ""} />
      </label>
      <fieldset className="m-0 min-w-0 rounded-lg border border-slate-700 px-3 pb-3">
        <legend className="bg-slate-900 px-1 text-xs text-slate-300">{t(lang, "urls")}</legend>
        <div className="grid gap-3">
          <UrlField name="websiteHome" label={t(lang, "websiteHome")} value={company?.websiteHome ?? ""} />
          <UrlField name="websitePeople" label={t(lang, "websitePeople")} value={company?.websitePeople ?? ""} />
          <UrlField name="websiteJobs" label={t(lang, "websiteJobs")} value={company?.websiteJobs ?? ""} />
          <UrlField name="linkedinUrl" label={t(lang, "companyLinkedIn")} value={company?.linkedinUrl ?? ""} />
        </div>
      </fieldset>
      <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} />
      {company ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="following" value="1" defaultChecked={company.following} />
          {t(lang, "following")}
        </label>
      ) : null}
      <div>
        <SubmitButton label={t(lang, "save")} thin />
      </div>
    </form>
  );
}

function UrlField({ name, label, value }: { name: string; label: string; value: string }) {
  const href = value.trim();
  const linked = isHttpUrl(href);
  return (
    <div>
      {linked ? (
        <a className={`${labelClass} text-sky-300 hover:text-sky-200`} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <input
        className={fieldClass}
        name={name}
        type="text"
        inputMode="url"
        defaultValue={value}
        dir="ltr"
        placeholder="https://"
        aria-label={label}
      />
    </div>
  );
}
