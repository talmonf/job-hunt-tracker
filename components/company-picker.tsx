"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { RELATIONSHIP_MAX, sameCompanyName } from "@/lib/company-name";
import { canonicalPartialDate } from "@/lib/partial-date";
import { dash } from "@/lib/mask";
import { fieldClass, labelClass } from "./widgets";

export type CompanyOption = { id: string; name: string; kind?: string };

export type CompanyLinkSelection = {
  id?: string;
  name: string;
  startedOn?: string;
  startedUnknown?: boolean;
  endedOn?: string;
  endedUnknown?: boolean;
  relationship?: string;
};

export type CompanyChip = {
  name: string;
  from: string;
  fromUnknown: boolean;
  to: string;
  toUnknown: boolean;
  relationship: string;
};

export function CompanyNameField({
  lang,
  names,
  defaultValue = "",
  required = false,
}: {
  lang: Lang;
  names: string[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className={labelClass}>{t(lang, "company")}</span>
      <input
        className={fieldClass}
        name="companyName"
        defaultValue={defaultValue}
        required={required}
        list="company-name-options"
        autoComplete="off"
      />
      <datalist id="company-name-options">
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </label>
  );
}

export function CompanyNamesField({
  lang,
  hide,
  companies,
  chips,
  onChipsChange,
  showDateError = false,
}: {
  lang: Lang;
  hide: boolean;
  companies: CompanyOption[];
  chips: CompanyChip[];
  onChipsChange: (chips: CompanyChip[]) => void;
  showDateError?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (!chips.some((item) => sameCompanyName(item.name, name))) {
      onChipsChange([...chips, { name, from: "", fromUnknown: false, to: "", toUnknown: false, relationship: "" }]);
    }
    setDraft("");
  }

  function update(name: string, patch: Partial<CompanyChip>) {
    onChipsChange(chips.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  }

  return (
    <div className="md:col-span-2">
      <input type="hidden" name="companiesManaged" value="1" />
      <span className={labelClass}>{t(lang, "companies")}</span>
      {chips.length ? (
        <ul className="mt-2 space-y-2">
          {chips.map((chip) => {
            const known = companies.find((company) => sameCompanyName(company.name, chip.name));
            const own = known?.kind === "own";
            const connection = (
              <label className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 text-xs leading-none text-slate-300">{t(lang, "relationship")}</span>
                <input
                  className="w-64 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-start text-sm text-slate-100 outline-none focus:border-sky-500"
                  value={chip.relationship}
                  maxLength={RELATIONSHIP_MAX}
                  onChange={(event) => update(chip.name, { relationship: event.target.value })}
                />
                <span className="text-[11px] italic text-slate-500">
                  {t(lang, own ? "relationshipOwnHint" : "relationshipTrackedHint")}
                </span>
              </label>
            );
            return (
              <li key={chip.name} className="rounded-md border border-slate-600 p-2">
                <div className="flex items-center gap-2 text-sm">
                  {known ? (
                    <Link className="text-sky-300" href={`/companies/${known.id}`}>
                      {dash(chip.name, hide)}
                    </Link>
                  ) : (
                    <span>{dash(chip.name, hide)}</span>
                  )}
                  <button
                    className="text-slate-400"
                    type="button"
                    aria-label={t(lang, "delete")}
                    onClick={() => onChipsChange(chips.filter((item) => item.name !== chip.name))}
                  >
                    ×
                  </button>
                </div>
                {own ? connection : null}
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <DateBound
                    lang={lang}
                    label={t(lang, "workedFrom")}
                    kind="from"
                    value={chip.from}
                    unknown={chip.fromUnknown}
                    forceError={showDateError}
                    onValue={(from) => update(chip.name, { from })}
                    onUnknown={(fromUnknown) => update(chip.name, { fromUnknown, from: fromUnknown ? "" : chip.from })}
                  />
                  <DateBound
                    lang={lang}
                    label={t(lang, "workedTo")}
                    kind="to"
                    value={chip.to}
                    unknown={chip.toUnknown}
                    forceError={showDateError}
                    onValue={(to) => update(chip.name, { to })}
                    onUnknown={(toUnknown) => update(chip.name, { toUnknown, to: toUnknown ? "" : chip.to })}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{t(lang, own ? "relationshipDatesOptional" : "stillThereHint")}</p>
                {own ? null : connection}
                <input type="hidden" name="companyNames" value={chip.name} />
                <input type="hidden" name="companyFrom" value={chip.fromUnknown ? "" : (canonicalPartialDate(chip.from) ?? chip.from)} />
                <input type="hidden" name="companyFromUnknown" value={chip.fromUnknown ? "1" : "0"} />
                <input type="hidden" name="companyTo" value={chip.toUnknown ? "" : (canonicalPartialDate(chip.to) ?? chip.to)} />
                <input type="hidden" name="companyToUnknown" value={chip.toUnknown ? "1" : "0"} />
                <input type="hidden" name="companyRelationship" value={chip.relationship} />
              </li>
            );
          })}
        </ul>
      ) : null}
      <input
        className={`${fieldClass} mt-2`}
        value={draft}
        list="company-names-options"
        autoComplete="off"
        placeholder={t(lang, "company")}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          add(event.currentTarget.value);
        }}
        onBlur={(event) => add(event.currentTarget.value)}
      />
      <datalist id="company-names-options">
        {companies.map((company) => (
          <option key={company.id} value={company.name} />
        ))}
      </datalist>
    </div>
  );
}

function DateBound({
  lang,
  label,
  kind,
  value,
  unknown,
  forceError = false,
  onValue,
  onUnknown,
}: {
  lang: Lang;
  label: string;
  kind: "from" | "to";
  value: string;
  unknown: boolean;
  forceError?: boolean;
  onValue: (value: string) => void;
  onUnknown: (unknown: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState(false);
  const invalid = !unknown && value.trim() !== "" && !canonicalPartialDate(value);
  const visibleError = invalid && (showError || forceError);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setCustomValidity(invalid ? t(lang, "errorDate") : "");
  }, [invalid, lang]);

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!input || !form) return;
    const onSubmit = (event: Event) => {
      if (event.target !== form || input.disabled) return;
      const raw = input.value.trim();
      if (!raw) return;
      const canonical = canonicalPartialDate(raw);
      if (!canonical) {
        event.preventDefault();
        event.stopPropagation();
        setShowError(true);
        return;
      }
      const hiddenName = input.dataset.partialDate === "to" ? "companyTo" : "companyFrom";
      const hidden = input.closest("li")?.querySelector<HTMLInputElement>(`input[type="hidden"][name="${hiddenName}"]`);
      if (hidden) hidden.value = canonical;
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  function apply(raw: string) {
    const trimmed = raw.trim();
    if (/^\d{8}$/.test(trimmed)) {
      const canonical = canonicalPartialDate(trimmed);
      if (canonical) {
        onValue(canonical);
        setShowError(false);
        return;
      }
    }
    onValue(raw);
    if (!trimmed || canonicalPartialDate(trimmed)) setShowError(false);
  }

  return (
    <label>
      <span className={labelClass}>{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          ref={inputRef}
          className={`${fieldClass}${visibleError ? " ring-1 ring-rose-500" : ""}`}
          dir="ltr"
          data-partial-date={kind}
          value={unknown ? "" : value}
          disabled={unknown}
          placeholder={t(lang, "partialDateHint")}
          aria-invalid={visibleError}
          onChange={(event) => apply(event.target.value)}
          onBlur={() => {
            if (unknown) return;
            const canonical = canonicalPartialDate(value);
            if (canonical) {
              if (canonical !== value) onValue(canonical);
              setShowError(false);
              return;
            }
            if (value.trim()) setShowError(true);
          }}
          onInvalid={(event) => {
            if (!event.currentTarget.validity.customError) return;
            event.preventDefault();
            setShowError(true);
          }}
        />
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-300">
          <input type="checkbox" checked={unknown} onChange={(event) => onUnknown(event.target.checked)} />
          {t(lang, "dateUnknown")}
        </span>
      </span>
      {visibleError ? <span className="mt-1 block text-xs text-rose-300">{t(lang, "errorDate")}</span> : null}
    </label>
  );
}
