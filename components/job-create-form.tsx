import { EMPLOYMENT_TYPES, ENGAGEMENTS, WORK_ARRANGEMENTS } from "@/lib/events";
import type { FillAccess } from "@/lib/ai/feature-access";
import { createJob } from "@/lib/actions/jobs";
import { t, type Lang } from "@/lib/i18n";
import type { TagRef } from "@/lib/tags";
import { AttributeSelect, SubmitButton, WorkArrangementField, fieldClass, labelClass } from "./widgets";
import { CompanyNameField } from "./company-picker";
import { FillJobDetails } from "./fill-job-details";
import { JobScheduleFields } from "./job-schedule-fields";
import { JobUrlsEditor } from "./job-urls";
import { MentionTextarea } from "./mention-textarea";
import { TagPicker } from "./tag-picker";
import type { LocalPerson } from "./person-picker";

export function JobCreateForm({
  lang,
  hide,
  returnTo,
  companyName = "",
  companyNames,
  localContacts,
  googleConnected,
  jobFillAccess,
  interestDate,
  followUpAt,
  tags,
}: {
  lang: Lang;
  hide: boolean;
  returnTo: string;
  companyName?: string;
  companyNames: string[];
  localContacts: LocalPerson[];
  googleConnected: boolean;
  jobFillAccess: FillAccess;
  interestDate: string;
  followUpAt: string;
  tags: TagRef[];
}) {
  return (
    <form id="job-form" action={createJob} className="grid gap-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="w-64 max-w-full">
          <CompanyNameField lang={lang} names={companyNames} defaultValue={companyName} required />
        </div>
        <label className="w-80 max-w-full">
          <span className={labelClass}>{t(lang, "title")}</span>
          <input className={fieldClass} name="title" />
        </label>
        <label className="w-96 max-w-full">
          <span className={labelClass}>{t(lang, "location")}</span>
          <input className={fieldClass} name="location" />
        </label>
        <AttributeSelect lang={lang} name="employmentType" label={t(lang, "employmentType")} options={EMPLOYMENT_TYPES} />
        <AttributeSelect lang={lang} name="engagement" label={t(lang, "engagement")} options={ENGAGEMENTS} />
        <WorkArrangementField lang={lang} options={WORK_ARRANGEMENTS} />
      </div>
      <FillJobDetails lang={lang} access={jobFillAccess} lead="create">
        <MentionTextarea
          lang={lang}
          name="description"
          label={t(lang, "description")}
          rows={8}
          localContacts={localContacts}
          googleConnected={googleConnected}
          allowUrl={false}
        />
      </FillJobDetails>
      <JobUrlsEditor lang={lang} />
      <JobScheduleFields lang={lang} interestDate={interestDate} followUpAt={followUpAt} />
      <TagPicker lang={lang} hide={hide} tags={tags} selected={[]} />
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
