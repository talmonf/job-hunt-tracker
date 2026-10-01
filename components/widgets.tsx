"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { jobAttributeLabel, t } from "@/lib/i18n";

export const fieldClass =
  "w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";
export const labelClass = "mb-1 block text-xs text-slate-300";
export const compactFieldClass =
  "w-full rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 text-xs leading-tight text-slate-100 outline-none focus:border-sky-500";
export const compactLabelClass = "mb-0.5 block text-[11px] leading-none text-slate-400";
export const primaryButton =
  "rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60";
export const quietButton = "rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800";
const dateInputClass =
  "box-border w-[calc(10ch+2.75rem+2px)] rounded-md border border-slate-600 bg-slate-950 py-1.5 ps-2 pe-9 text-sm text-slate-100 outline-none focus:border-sky-500";
const compactDateInputClass =
  "box-border w-[calc(10ch+1.625rem+2px)] rounded border border-slate-600 bg-slate-950 py-0.5 ps-1.5 pe-5 text-xs leading-tight text-slate-100 outline-none focus:border-sky-500";
const timeSelectClass =
  "w-[4.25rem] rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";

export function AttributeSelect({
  lang,
  name,
  label,
  options,
  value = "",
}: {
  lang: Lang;
  name: string;
  label: string;
  options: readonly string[];
  value?: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <select className={fieldClass} name={name} defaultValue={value}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {jobAttributeLabel(lang, option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${primaryButton} inline-flex items-center gap-2`} disabled={pending} type="submit" aria-busy={pending}>
      {pending ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {label}
    </button>
  );
}

export function PasswordField({ name, label, autoComplete }: { name: string; label: string; autoComplete?: string }) {
  const [shown, setShown] = useState(false);
  const { pending } = useFormStatus();
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="flex gap-2">
        <input className={fieldClass} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} required />
        <button className={quietButton} type="button" onClick={() => setShown((value) => !value)} disabled={pending}>
          {shown ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

export function PasswordFieldLabeled({
  name,
  label,
  show,
  hide,
  autoComplete,
  required = true,
}: {
  name: string;
  label: string;
  show: string;
  hide: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const { pending } = useFormStatus();
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="flex gap-2">
        <input className={fieldClass} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} required={required} />
        <button className={quietButton} type="button" onClick={() => setShown((value) => !value)} disabled={pending}>
          {shown ? hide : show}
        </button>
      </span>
    </label>
  );
}

export function DateField({
  name,
  defaultValue,
  required = false,
  lang = "en",
  compact = false,
  onCommit,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  lang?: Lang;
  compact?: boolean;
  onCommit?: (iso: string) => void;
}) {
  const [text, setText] = useState(isoDateToDisplay(defaultValue ?? ""));
  const lastCommitted = useRef(displayDateToIso(isoDateToDisplay(defaultValue ?? "")));
  const iso = displayDateToIso(text);

  function emit(nextIso: string) {
    if (nextIso === lastCommitted.current) return;
    lastCommitted.current = nextIso;
    onCommit?.(nextIso);
  }

  function commit(nextText: string) {
    if (!onCommit) return;
    if (!nextText.trim()) {
      setText("");
      emit("");
      return;
    }
    const nextIso = displayDateToIso(nextText);
    if (nextIso) {
      setText(nextText);
      emit(nextIso);
      return;
    }
    setText(isoDateToDisplay(lastCommitted.current));
  }

  return (
    <>
      <DatePicker
        lang={lang}
        text={text}
        compact={compact}
        onTextChange={setText}
        required={required}
        onPick={(picked) => {
          setText(picked);
          commit(picked);
        }}
        onBlur={() => commit(text)}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

export function DateTimeField({
  name,
  defaultValue,
  required = false,
  lang = "en",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  lang?: Lang;
}) {
  const initial = splitDateTime(defaultValue ?? "", required);
  const [text, setText] = useState(initial.date);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const isoDate = displayDateToIso(text);
  const timeRequired = required || Boolean(isoDate);
  const iso = isoDate && hour && minute ? `${isoDate}T${hour}:${minute}` : "";

  function applyDateText(next: string) {
    setText(next);
    if (!next.trim()) {
      if (!required) {
        setHour("");
        setMinute("");
      }
      return;
    }
    if (displayDateToIso(next)) {
      setHour((current) => current || "09");
      setMinute((current) => current || "00");
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <DatePicker lang={lang} text={text} onTextChange={applyDateText} required={required} onPick={applyDateText} />
      <label className="block" dir="ltr">
        <span className={labelClass}>{t(lang, "timeHour")}</span>
        <select
          className={timeSelectClass}
          value={hour}
          required={timeRequired}
          onChange={(event) => {
            const next = event.target.value;
            setHour(next);
            if (next && !minute) setMinute("00");
          }}
        >
          {timeRequired ? null : <option value="" />}
          {HOURS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="block" dir="ltr">
        <span className={labelClass}>{t(lang, "timeMinute")}</span>
        <select
          className={timeSelectClass}
          value={minute}
          required={timeRequired}
          onChange={(event) => {
            const next = event.target.value;
            setMinute(next);
            if (next && !hour) setHour("09");
          }}
        >
          {timeRequired ? null : <option value="" />}
          {MINUTES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}

function DatePicker({
  lang,
  text,
  onTextChange,
  required = false,
  compact = false,
  onPick,
  onBlur,
}: {
  lang: Lang;
  text: string;
  onTextChange: (value: string) => void;
  required?: boolean;
  compact?: boolean;
  onPick?: (value: string) => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState({ top: 0, left: 0 });
  const today = todayYmd();
  const selected = parseDisplayDate(text);
  const [view, setView] = useState({ year: (selected ?? today).year, month: (selected ?? today).month });
  const ref = useRef<HTMLDivElement>(null);
  const locale = lang === "he" ? "he-IL" : "en-GB";

  useEffect(() => {
    if (!open) return;
    const current = parseDisplayDate(text) ?? todayYmd();
    setView({ year: current.year, month: current.month });
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 288;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const below = rect.bottom + 4;
      const top = below + 280 > window.innerHeight && rect.top > 280 ? rect.top - 284 : below;
      setPopup({ top, left });
    };
    place();
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
    // text is read when the picker opens; do not reset the month while typing.
  }, [open]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(view.year, view.month - 1, 1));
  const weekdays = weekdayLabels(locale);
  const cells = monthCells(view.year, view.month);

  return (
    <div className="relative w-fit" ref={ref}>
      <span className="relative inline-block">
        <input
          className={compact ? compactDateInputClass : dateInputClass}
          value={text}
          placeholder="dd/mm/yyyy"
          inputMode="numeric"
          required={required}
          aria-required={required}
          onChange={(event) => onTextChange(event.target.value)}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            const dialog = ref.current?.querySelector("[role='dialog']");
            if (dialog && next && dialog.contains(next)) return;
            onBlur?.();
          }}
        />
        <button
          className={`absolute top-1/2 -translate-y-1/2 rounded text-slate-300 hover:bg-slate-800 hover:text-white ${compact ? "end-0.5 p-0.5" : "end-1 p-1"}`}
          type="button"
          aria-label={t(lang, "chooseDate")}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <CalendarIcon compact={compact} />
        </button>
      </span>
      {open ? (
        <div
          className="fixed z-50 w-72 rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg"
          style={{ top: popup.top, left: popup.left }}
          dir="ltr"
          role="dialog"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button className={quietButton} type="button" aria-label={t(lang, "prevMonth")} onClick={() => setView((current) => shiftMonth(current, -1))}>
              ‹
            </button>
            <div className="text-sm font-medium text-slate-100">{monthLabel}</div>
            <button className={quietButton} type="button" aria-label={t(lang, "nextMonth")} onClick={() => setView((current) => shiftMonth(current, 1))}>
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-slate-400">
            {weekdays.map((day, index) => (
              <div key={`${day}-${index}`}>{day}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              const isSelected = selected?.year === view.year && selected?.month === view.month && selected.day === day;
              const isToday = today.year === view.year && today.month === view.month && today.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  className={`rounded py-1 text-sm ${
                    isSelected
                      ? "bg-sky-500 font-semibold text-slate-950"
                      : isToday
                        ? "ring-1 ring-sky-500 text-slate-100 hover:bg-slate-800"
                        : "text-slate-200 hover:bg-slate-800"
                  }`}
                  onClick={() => {
                    const picked = formatDisplayDate({ year: view.year, month: view.month, day });
                    onTextChange(picked);
                    onPick?.(picked);
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`${quietButton} mt-2 w-full`}
            onClick={() => {
              const picked = formatDisplayDate(todayYmd());
              onTextChange(picked);
              onPick?.(picked);
              setOpen(false);
            }}
          >
            {t(lang, "today")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CalendarIcon({ compact = false }: { compact?: boolean }) {
  return (
    <svg className={compact ? "h-3 w-3" : "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm10 7H4v7h12V9z" />
    </svg>
  );
}

export function MultiSelect({
  name,
  options,
  selected,
  anyLabel,
  selectAll,
  deselectAll,
  done,
  selectedWord,
  compact = false,
}: {
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  anyLabel: string;
  selectAll: string;
  deselectAll: string;
  done: string;
  selectedWord: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(selected);
  const summary = useMemo(() => {
    if (values.length === 0) return anyLabel;
    if (values.length === 1) return options.find((option) => option.value === values[0])?.label ?? values[0];
    return `${values.length} ${selectedWord}`;
  }, [anyLabel, options, selectedWord, values]);
  return (
    <div className="relative">
      <button
        className={`${compact ? compactFieldClass : fieldClass} truncate text-start`}
        type="button"
        title={summary}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {summary}
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-64 rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg">
          <div className="mb-2 flex gap-2 text-xs">
            <button type="button" className="text-sky-300" onClick={() => setValues(options.map((option) => option.value))}>
              {selectAll}
            </button>
            <button type="button" className="text-slate-300" onClick={() => setValues([])}>
              {deselectAll}
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-auto">
            {options.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.includes(option.value)}
                  onChange={(event) => {
                    setValues((current) =>
                      event.target.checked ? [...current, option.value] : current.filter((value) => value !== option.value),
                    );
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
          <button type="button" className={`${quietButton} mt-2`} onClick={() => setOpen(false)}>
            {done}
          </button>
        </div>
      ) : null}
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}

export function ConfirmSubmit({
  action,
  message,
  label,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  message: string;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
      <button className={className ?? quietButton} type="submit">
        {label}
      </button>
    </form>
  );
}

export function ObfuscateToggle({
  action,
  hide,
  label,
}: {
  action: (formData: FormData) => void;
  hide: boolean;
  label: string;
  returnTo?: string;
}) {
  const returnTo = usePathname();
  return (
    <form action={action}>
      <input type="hidden" name="value" value={hide ? "0" : "1"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ToggleBox label={label} checked={hide} />
    </form>
  );
}

function ToggleBox({ label, checked }: { label: string; checked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-200">
      <input type="checkbox" checked={checked} disabled={pending} onChange={(event) => event.currentTarget.form?.requestSubmit()} />
      {label}
    </label>
  );
}

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <>
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm ${active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function UserMenu({
  initials,
  name,
  isAdmin,
  adminLabel,
  changePasswordLabel,
  children,
}: {
  initials: string;
  name: string;
  isAdmin: boolean;
  adminLabel: string;
  changePasswordLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={name}
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {initials}
      </button>
      {open ? (
        <div role="menu" className="absolute end-0 z-30 mt-2 w-56 rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg">
          <div className="border-b border-slate-700 px-3 py-2 text-sm text-slate-200">
            {name}
            {isAdmin ? <span className="ms-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-100">{adminLabel}</span> : null}
          </div>
          <Link role="menuitem" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" href="/change-password">
            {changePasswordLabel}
          </Link>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SignOutButton({
  action,
  label,
  confirm,
  className,
}: {
  action: () => void;
  label: string;
  confirm: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      <button className={className ?? "text-sm text-slate-300 hover:text-white"} role="menuitem" type="submit">
        {label}
      </button>
    </form>
  );
}

export function LanguageSwitch({
  action,
  lang,
}: {
  action: (formData: FormData) => void;
  lang: Lang;
  returnTo?: string;
}) {
  const returnTo = usePathname();
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-700">
      {(["en", "he"] as const).map((value) => (
        <form key={value} action={action}>
          <input type="hidden" name="ui_language" value={value} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            className={`px-2 py-1 text-xs font-semibold ${lang === value ? "bg-slate-600 text-slate-50 shadow-inner" : "text-slate-400 hover:text-slate-100"}`}
            type="submit"
          >
            {value === "en" ? "EN" : "עב"}
          </button>
        </form>
      ))}
    </div>
  );
}

export function ruleLines(lang: Lang) {
  return [t(lang, "ruleLength"), t(lang, "ruleLower"), t(lang, "ruleUpper"), t(lang, "ruleDigit")];
}

function isoDateToDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function splitDateTime(value: string, required: boolean) {
  const date = isoDateToDisplay(value);
  const match = /T(\d{2}):(\d{2})/.exec(value);
  if (!match) return { date, hour: required ? "09" : "", minute: required ? "00" : "" };
  const hourNum = Number(match[1]);
  const minuteNum = Number(match[2]);
  const hour = hourNum >= 0 && hourNum <= 23 ? pad2(hourNum) : required ? "09" : "";
  const minute = pad2(Math.min(55, Math.round(minuteNum / 5) * 5));
  return { date, hour, minute };
}

const HOURS = Array.from({ length: 24 }, (_, hour) => pad2(hour));
const MINUTES = Array.from({ length: 12 }, (_, step) => pad2(step * 5));

function displayDateToIso(value: string) {
  const parsed = parseDisplayDate(value);
  if (!parsed) return "";
  return formatIsoDate(parsed);
}

function parseDisplayDate(value: string): Ymd | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const last = new Date(year, month, 0).getDate();
  if (day > last) return null;
  return { year, month, day };
}

function formatDisplayDate(parts: Ymd) {
  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
}

function formatIsoDate(parts: Ymd) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function todayYmd(): Ymd {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function shiftMonth(view: { year: number; month: number }, delta: number) {
  const date = new Date(view.year, view.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function monthCells(year: number, month: number) {
  const weekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const last = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < weekday; i += 1) cells.push(null);
  for (let day = 1; day <= last; day += 1) cells.push(day);
  return cells;
}

function weekdayLabels(locale: string) {
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 8, 6 + weekday)),
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

type Ymd = { year: number; month: number; day: number };
