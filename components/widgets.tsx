"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export const fieldClass =
  "w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";
export const labelClass = "mb-1 block text-xs text-slate-300";
export const primaryButton =
  "rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60";
export const quietButton = "rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800";

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={primaryButton} disabled={pending} type="submit">
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

export function DateField({ name, defaultValue, required = false }: { name: string; defaultValue?: string; required?: boolean }) {
  const [text, setText] = useState(isoDateToDisplay(defaultValue ?? ""));
  const iso = displayDateToIso(text);
  return (
    <>
      <input
        className={fieldClass}
        value={text}
        placeholder="dd/mm/yyyy"
        inputMode="numeric"
        aria-required={required}
        onChange={(event) => setText(event.target.value)}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

export function DateTimeField({ name, defaultValue, required = false }: { name: string; defaultValue?: string; required?: boolean }) {
  const [text, setText] = useState(isoDateTimeToDisplay(defaultValue ?? ""));
  const iso = displayDateTimeToIso(text);
  return (
    <>
      <input
        className={fieldClass}
        value={text}
        placeholder="dd/mm/yyyy hh:mm"
        aria-required={required}
        onChange={(event) => setText(event.target.value)}
      />
      <input type="hidden" name={name} value={iso} />
    </>
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
}: {
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  anyLabel: string;
  selectAll: string;
  deselectAll: string;
  done: string;
  selectedWord: string;
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
      <button className={`${fieldClass} text-start`} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
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

export function ConfirmSubmit({ action, message, label, className }: { action: (formData: FormData) => void; message: string; label: string; className?: string }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
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

function displayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isoDateTimeToDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
}

function displayDateTimeToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}`;
}
