"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Lang } from "@/lib/i18n";
import { companyKindLabel, companySizeLabel, companyStageLabel, t } from "@/lib/i18n";
import { COMPANY_KINDS, COMPANY_STAGES } from "@/lib/company-name";
import { COMPANY_SIZES } from "@/lib/company-size";
import { isHttpUrl } from "@/lib/entity-links";
import { canonicalPartialDate } from "@/lib/partial-date";
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
    kind: string;
    stage: string | null;
  };
}) {
  const [kind, setKind] = useState(company?.kind ?? "tracked");
  const [stage, setStage] = useState(company?.stage || "idea");
  const [dateError, setDateError] = useState(false);
  const foundedRef = useRef<HTMLInputElement>(null);

  function applyFounded(input: HTMLInputElement, commit: boolean) {
    const trimmed = input.value.trim();
    const digits = /^\d{8}$/.test(trimmed) ? canonicalPartialDate(trimmed) : null;
    if (digits) {
      input.value = digits;
      input.setCustomValidity("");
      setDateError(false);
      return;
    }
    const canonical = trimmed ? canonicalPartialDate(trimmed) : "";
    if (commit && canonical && canonical !== trimmed) input.value = canonical;
    const bad = trimmed !== "" && !canonical;
    input.setCustomValidity(bad ? t(lang, "errorDate") : "");
    if (!bad) setDateError(false);
    else if (commit) setDateError(true);
  }

  useEffect(() => {
    const input = foundedRef.current;
    const form = input?.form;
    if (!input || !form) return;
    const onSubmit = (event: Event) => {
      if (event.target !== form) return;
      const trimmed = input.value.trim();
      if (!trimmed) return;
      const canonical = canonicalPartialDate(trimmed);
      if (!canonical) {
        event.preventDefault();
        event.stopPropagation();
        setDateError(true);
        input.focus();
        return;
      }
      input.value = canonical;
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  function guardFounded(event: FormEvent<HTMLFormElement>) {
    const input = foundedRef.current;
    if (!input) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;
    if (canonicalPartialDate(trimmed)) {
      input.value = canonicalPartialDate(trimmed) ?? trimmed;
      input.setCustomValidity("");
      return;
    }
    event.preventDefault();
    input.setCustomValidity(t(lang, "errorDate"));
    setDateError(true);
    input.focus();
  }

  return (
    <form action={action} className="grid max-w-5xl gap-3" onSubmit={guardFounded}>
      {company ? <input type="hidden" name="companyId" value={company.id} /> : null}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className="w-64 max-w-full">
          <span className={labelClass}>{t(lang, "company")}</span>
          <input className={fieldClass} name="name" defaultValue={company?.name ?? ""} required />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <label className="flex items-center gap-2">
            <span className={inlineLabelClass}>{t(lang, "dateFounded")}</span>
            <input
              ref={foundedRef}
              className={`${dateInputClass}${dateError ? " ring-1 ring-rose-500" : ""}`}
              name="foundedOn"
              defaultValue={company?.foundedOn ?? ""}
              dir="ltr"
              aria-invalid={dateError}
              onChange={(event) => applyFounded(event.target, false)}
              onBlur={(event) => applyFounded(event.target, true)}
              onInvalid={(event) => {
                if (!event.currentTarget.validity.customError) return;
                event.preventDefault();
                setDateError(true);
              }}
            />
          </label>
          <span className={dateError ? "text-xs text-rose-300" : hintClass}>
            {dateError ? t(lang, "errorDate") : t(lang, "partialDateHint")}
          </span>
        </div>
        <label className="w-fit max-w-full">
          <span className={labelClass}>{t(lang, "companyKind")}</span>
          <select className={narrowSelectClass} name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
            {COMPANY_KINDS.map((option) => (
              <option key={option} value={option}>
                {companyKindLabel(lang, option)}
              </option>
            ))}
          </select>
        </label>
        {kind === "own" ? (
          <label className="w-fit max-w-full">
            <span className={labelClass}>{t(lang, "companyStage")}</span>
            <select className={narrowSelectClass} name="stage" value={stage} onChange={(event) => setStage(event.target.value)}>
              {COMPANY_STAGES.map((option) => (
                <option key={option} value={option}>
                  {companyStageLabel(lang, option)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <UrlField lang={lang} name="websiteHome" label={t(lang, "websiteHome")} value={company?.websiteHome ?? ""} saved={Boolean(company)} />
          <UrlField lang={lang} name="websitePeople" label={t(lang, "websitePeople")} value={company?.websitePeople ?? ""} saved={Boolean(company)} />
          <UrlField lang={lang} name="websiteJobs" label={t(lang, "websiteJobs")} value={company?.websiteJobs ?? ""} saved={Boolean(company)} />
          <UrlField lang={lang} name="linkedinUrl" label={t(lang, "companyLinkedIn")} value={company?.linkedinUrl ?? ""} saved={Boolean(company)} />
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

function UrlField({
  lang,
  name,
  label,
  value,
  saved,
}: {
  lang: Lang;
  name: string;
  label: string;
  value: string;
  saved: boolean;
}) {
  const href = value.trim();
  const canShowLink = saved && href !== "";
  const [editing, setEditing] = useState(!canShowLink);
  const opened = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (opened.current) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        {isHttpUrl(href) ? (
          <a className="text-sm text-sky-300 hover:text-sky-200" href={href} target="_blank" rel="noreferrer" title={href}>
            {label}
          </a>
        ) : (
          <span className="text-sm text-slate-100" title={href}>
            {label}
          </span>
        )}
        <button
          type="button"
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label={t(lang, "edit")}
          onClick={() => {
            opened.current = true;
            setEditing(true);
          }}
        >
          <PencilIcon />
        </button>
        <input type="hidden" name={name} value={value} />
      </div>
    );
  }

  return (
    <label className="w-full">
      <span className={labelClass}>{label}</span>
      <input
        ref={inputRef}
        className={fieldClass}
        name={name}
        type="text"
        inputMode="url"
        defaultValue={value}
        dir="ltr"
        placeholder="https://"
        aria-label={label}
      />
    </label>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
      <path d="M13.2 2.8a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1l-8.3 8.3-3.6.7.6-3.7 7.3-9.3Z" />
      <path d="M3 17.2h14v1.3H3z" />
    </svg>
  );
}
