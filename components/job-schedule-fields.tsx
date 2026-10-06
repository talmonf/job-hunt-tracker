import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { DateField, DateTimeField, compactLabelClass } from "./widgets";

const inlineLabelClass = "pb-1 text-xs font-medium text-slate-100";
const hintClass = "max-w-[16rem] pb-1 text-[11px] italic leading-snug text-slate-500";
const reminderFieldClass =
  "w-10 rounded border border-slate-600 bg-transparent px-0.5 py-0.5 text-center text-xs leading-tight text-slate-100 outline-none [color-scheme:dark] focus:border-sky-500";

export function JobScheduleFields({
  lang,
  interestDate,
  followUpAt,
  reminderLeadDays,
  reminderLeadHours,
  clearable = false,
}: {
  lang: Lang;
  interestDate: string;
  followUpAt: string;
  reminderLeadDays?: number | null;
  reminderLeadHours?: number | null;
  clearable?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "interestDate")}</span>
        <DateField name="interestDate" defaultValue={interestDate} required compact lang={lang} />
      </div>
      <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "followUp")}</span>
        <DateTimeField name="followUpAt" defaultValue={followUpAt} lang={lang} compact clearable={clearable} />
        <p className={hintClass}>{t(lang, "followUpHelp")}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "reminderLead")}</span>
        <label className="shrink-0">
          <span className={compactLabelClass}>{t(lang, "days")}</span>
          <input
            className={reminderFieldClass}
            name="reminderLeadDays"
            defaultValue={reminderLeadDays ?? ""}
            inputMode="numeric"
          />
        </label>
        <label className="shrink-0">
          <span className={compactLabelClass}>{t(lang, "hours")}</span>
          <input
            className={reminderFieldClass}
            name="reminderLeadHours"
            defaultValue={reminderLeadHours ?? ""}
            inputMode="numeric"
          />
        </label>
        <p className={hintClass}>{t(lang, "reminderBlank")}</p>
      </div>
    </div>
  );
}
