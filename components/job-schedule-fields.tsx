import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { DateField, DateTimeField } from "./widgets";

const inlineLabelClass = "shrink-0 text-xs font-medium leading-none text-slate-100";
const hintClass = "min-w-0 max-w-[16rem] text-[11px] italic leading-tight text-slate-500";
const microLabelClass = "text-[11px] leading-none text-slate-400";
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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "interestDate")}</span>
        <DateField name="interestDate" defaultValue={interestDate} required compact lang={lang} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "followUp")}</span>
        <DateTimeField name="followUpAt" defaultValue={followUpAt} lang={lang} compact clearable={clearable} inlineLabels />
        <p className={hintClass}>{t(lang, "followUpHelp")}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={inlineLabelClass}>{t(lang, "reminderLead")}</span>
        <label className="flex shrink-0 items-center gap-1">
          <span className={microLabelClass}>{t(lang, "days")}</span>
          <input
            className={reminderFieldClass}
            name="reminderLeadDays"
            defaultValue={reminderLeadDays ?? ""}
            inputMode="numeric"
          />
        </label>
        <label className="flex shrink-0 items-center gap-1">
          <span className={microLabelClass}>{t(lang, "hours")}</span>
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
