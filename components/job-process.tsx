"use client";

import { useState } from "react";
import { addProcessStep, deleteProcessStep, moveProcessStep, toggleProcessStep, updateProcessStep } from "@/lib/actions/process-steps";
import { processMediumLabel, t, type Lang } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { CUSTOM_MEDIUM, isPresetMedium, PROCESS_MEDIA, type StepTiming } from "@/lib/process-steps";
import { SettingsSection } from "./settings-section";
import { DateTimeField, SubmitButton, fieldClass, labelClass, thinPrimaryButton } from "./widgets";

export type JobProcessStepView = {
  id: string;
  label: string;
  medium: string;
  withWhom: string;
  notes: string;
  scheduledInput: string;
  whenLabel: string;
  timing: StepTiming;
};

const mediumSelectClass =
  "w-40 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500";

function displayMedium(medium: string, lang: Lang, hide: boolean) {
  const trimmed = medium.trim();
  if (!trimmed) return "";
  if (isPresetMedium(trimmed)) return processMediumLabel(lang, trimmed);
  return maskText(trimmed, hide);
}

export function JobProcessSection({
  lang,
  hide,
  jobId,
  summary,
  done,
  total,
  steps,
}: {
  lang: Lang;
  hide: boolean;
  jobId: string;
  summary: string;
  done: number;
  total: number;
  steps: JobProcessStepView[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <SettingsSection
      id="process"
      title={t(lang, "process")}
      summary={<span className="truncate">{summary}</span>}
      badge={total ? `${done}/${total}` : undefined}
      defaultOpen={total > 0}
    >
      <ul className="space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-md border px-3 py-2 ${step.timing === "passed" ? "border-amber-700/70 bg-amber-950/30" : "border-slate-800"}`}
          >
            <div className="flex items-start gap-2">
              <form action={toggleProcessStep} className="pt-0.5">
                <input type="hidden" name="stepId" value={step.id} />
                <input
                  className="size-4 accent-sky-500"
                  type="checkbox"
                  name="done"
                  value="1"
                  defaultChecked={step.timing === "done"}
                  aria-label={t(lang, "done")}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                />
              </form>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-xs text-slate-500">{index + 1}</span>
                  <span className={`min-w-0 ${step.timing === "done" ? "text-slate-500 line-through" : "text-slate-100"}`}>
                    {dash(step.label, hide)}
                  </span>
                </p>
                {editingId === step.id ? null : <StepFacts lang={lang} hide={hide} step={step} />}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <MoveButton stepId={step.id} direction="up" disabled={index === 0} label={t(lang, "processMoveUp")} />
                <MoveButton stepId={step.id} direction="down" disabled={index === steps.length - 1} label={t(lang, "processMoveDown")} />
                {editingId === step.id ? null : (
                  <button
                    className="px-1 text-sm text-sky-300 hover:text-sky-200"
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditingId(step.id);
                    }}
                  >
                    {t(lang, "edit")}
                  </button>
                )}
              </div>
            </div>
            {editingId === step.id ? (
              <StepForm lang={lang} jobId={jobId} step={step} onCancel={() => setEditingId(null)} />
            ) : null}
          </li>
        ))}
      </ul>
      {adding ? (
        <StepForm lang={lang} jobId={jobId} step={null} onCancel={() => setAdding(false)} />
      ) : (
        <button
          className={`${total ? "mt-3 " : ""}${thinPrimaryButton}`}
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
        >
          {t(lang, "processAdd")}
        </button>
      )}
    </SettingsSection>
  );
}

function StepFacts({ lang, hide, step }: { lang: Lang; hide: boolean; step: JobProcessStepView }) {
  const medium = displayMedium(step.medium, lang, hide);
  const withWhom = step.withWhom.trim() ? dash(step.withWhom, hide) : "";
  const who = [medium, withWhom].filter(Boolean).join(" · ");
  const whenClass =
    step.timing === "passed" ? "text-amber-200" : step.timing === "scheduled" ? "text-sky-300" : "text-slate-500";
  return (
    <>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
        {who ? <span>{who}</span> : null}
        {step.timing === "todo" ? (
          <span className="text-[11px] italic text-slate-500">{t(lang, "processNotScheduled")}</span>
        ) : step.whenLabel ? (
          <span className={whenClass}>{step.whenLabel}</span>
        ) : null}
      </p>
      {step.notes.trim() ? <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{dash(step.notes, hide)}</p> : null}
    </>
  );
}

function MoveButton({
  stepId,
  direction,
  disabled,
  label,
}: {
  stepId: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveProcessStep}>
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        className="px-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function StepForm({
  lang,
  jobId,
  step,
  onCancel,
}: {
  lang: Lang;
  jobId: string;
  step: JobProcessStepView | null;
  onCancel: () => void;
}) {
  return (
    <form action={step ? updateProcessStep : addProcessStep} className="mt-3 space-y-3">
      <input type="hidden" name="jobId" value={jobId} />
      {step ? <input type="hidden" name="stepId" value={step.id} /> : null}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="w-80 max-w-full min-w-48 flex-1">
          <span className={labelClass}>{t(lang, "processName")}</span>
          <input className={fieldClass} name="label" required defaultValue={step?.label ?? ""} />
        </label>
        <MediumFields lang={lang} medium={step?.medium ?? ""} />
        <label className="w-56 max-w-full">
          <span className={labelClass}>{t(lang, "processWith")}</span>
          <input className={fieldClass} name="withWhom" defaultValue={step?.withWhom ?? ""} />
        </label>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="shrink-0 text-xs font-medium leading-none text-slate-100">{t(lang, "processWhen")}</span>
        <DateTimeField name="scheduledAt" defaultValue={step?.scheduledInput ?? ""} lang={lang} clearable inlineLabels />
        <p className="text-[11px] italic text-slate-500">{t(lang, "processWhenHint")}</p>
      </div>
      <label className="block">
        <span className={labelClass}>{t(lang, "processNotes")}</span>
        <textarea className={fieldClass} name="notes" rows={2} defaultValue={step?.notes ?? ""} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={t(lang, "save")} thin />
        <button className="text-sm text-slate-400 hover:text-slate-200" type="button" onClick={onCancel}>
          {t(lang, "cancel")}
        </button>
        {step ? (
          <button className="text-sm text-rose-300" formAction={deleteProcessStep} formNoValidate type="submit">
            {t(lang, "delete")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function MediumFields({ lang, medium }: { lang: Lang; medium: string }) {
  const preset = isPresetMedium(medium);
  const [choice, setChoice] = useState(medium.trim() ? (preset ? medium : CUSTOM_MEDIUM) : "");
  return (
    <>
      <label className="w-fit max-w-full">
        <span className={labelClass}>{t(lang, "processMedium")}</span>
        <select className={mediumSelectClass} name="medium" value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="">—</option>
          {PROCESS_MEDIA.map((key) => (
            <option key={key} value={key}>
              {processMediumLabel(lang, key)}
            </option>
          ))}
          <option value={CUSTOM_MEDIUM}>{t(lang, "processCustom")}</option>
        </select>
      </label>
      {choice === CUSTOM_MEDIUM ? (
        <label className="w-56 max-w-full">
          <span className={labelClass}>{t(lang, "processCustom")}</span>
          <input className={fieldClass} name="mediumCustom" required defaultValue={preset ? "" : medium} />
        </label>
      ) : null}
    </>
  );
}
