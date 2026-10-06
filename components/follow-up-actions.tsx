"use client";

import { useState } from "react";
import { completeFollowUp, rescheduleFollowUp } from "@/lib/actions/jobs";
import { t, type Lang } from "@/lib/i18n";
import { DateTimeField, SubmitButton } from "./widgets";

export function FollowUpActions({
  jobId,
  defaultValue,
  lang,
  returnTo,
}: {
  jobId: string;
  defaultValue: string;
  lang: Lang;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <form action={completeFollowUp}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <SubmitButton label={t(lang, "followUpDone")} thin />
      </form>
      {open ? (
        <form action={rescheduleFollowUp} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <DateTimeField name="followUpAt" defaultValue={defaultValue} lang={lang} compact required dateLabel={t(lang, "followUp")} />
          <SubmitButton label={t(lang, "save")} thin />
          <button className="pb-0.5 text-xs text-slate-400 hover:text-slate-200" type="button" onClick={() => setOpen(false)}>
            {t(lang, "cancel")}
          </button>
        </form>
      ) : (
        <button className={rescheduleButton} type="button" onClick={() => setOpen(true)}>
          {t(lang, "reschedule")}
        </button>
      )}
    </div>
  );
}

const rescheduleButton =
  "rounded-md border border-slate-600 px-2.5 py-0.5 text-sm font-semibold leading-tight text-slate-200 hover:bg-slate-800";
