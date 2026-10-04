"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { fieldClass, labelClass } from "./widgets";

export type CompanyOption = { id: string; name: string };

export type CompanyLinkSelection = {
  id?: string;
  name: string;
  startedOn?: string;
  startedUnknown?: boolean;
  endedOn?: string;
  endedUnknown?: boolean;
};

type Chip = {
  name: string;
  from: string;
  fromUnknown: boolean;
  to: string;
  toUnknown: boolean;
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
  selected,
}: {
  lang: Lang;
  hide: boolean;
  companies: CompanyOption[];
  selected: CompanyLinkSelection[];
}) {
  const [chips, setChips] = useState<Chip[]>(
    selected.map((company) => ({
      name: company.name,
      from: company.startedOn ?? "",
      fromUnknown: Boolean(company.startedUnknown),
      to: company.endedOn ?? "",
      toUnknown: Boolean(company.endedUnknown),
    })),
  );
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim();
    if (!name) return;
    setChips((current) =>
      current.some((item) => item.name.toLowerCase() === name.toLowerCase())
        ? current
        : [...current, { name, from: "", fromUnknown: false, to: "", toUnknown: false }],
    );
    setDraft("");
  }

  function update(name: string, patch: Partial<Chip>) {
    setChips((current) => current.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  }

  return (
    <div className="md:col-span-2">
      <input type="hidden" name="companiesManaged" value="1" />
      <span className={labelClass}>{t(lang, "companies")}</span>
      {chips.length ? (
        <ul className="mt-2 space-y-2">
          {chips.map((chip) => {
            const known = companies.find((company) => company.name.toLowerCase() === chip.name.toLowerCase());
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
                    onClick={() => setChips((current) => current.filter((item) => item.name !== chip.name))}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <DateBound
                    lang={lang}
                    label={t(lang, "workedFrom")}
                    value={chip.from}
                    unknown={chip.fromUnknown}
                    onValue={(from) => update(chip.name, { from })}
                    onUnknown={(fromUnknown) => update(chip.name, { fromUnknown, from: fromUnknown ? "" : chip.from })}
                  />
                  <DateBound
                    lang={lang}
                    label={t(lang, "workedTo")}
                    value={chip.to}
                    unknown={chip.toUnknown}
                    onValue={(to) => update(chip.name, { to })}
                    onUnknown={(toUnknown) => update(chip.name, { toUnknown, to: toUnknown ? "" : chip.to })}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{t(lang, "stillThereHint")}</p>
                <input type="hidden" name="companyNames" value={chip.name} />
                <input type="hidden" name="companyFrom" value={chip.fromUnknown ? "" : chip.from} />
                <input type="hidden" name="companyFromUnknown" value={chip.fromUnknown ? "1" : "0"} />
                <input type="hidden" name="companyTo" value={chip.toUnknown ? "" : chip.to} />
                <input type="hidden" name="companyToUnknown" value={chip.toUnknown ? "1" : "0"} />
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
  value,
  unknown,
  onValue,
  onUnknown,
}: {
  lang: Lang;
  label: string;
  value: string;
  unknown: boolean;
  onValue: (value: string) => void;
  onUnknown: (unknown: boolean) => void;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          className={fieldClass}
          dir="ltr"
          value={unknown ? "" : value}
          disabled={unknown}
          placeholder={t(lang, "partialDateHint")}
          onChange={(event) => onValue(event.target.value)}
        />
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-300">
          <input type="checkbox" checked={unknown} onChange={(event) => onUnknown(event.target.checked)} />
          {t(lang, "dateUnknown")}
        </span>
      </span>
    </label>
  );
}
