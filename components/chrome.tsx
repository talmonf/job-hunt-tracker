import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang, MessageKey } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";

export function PageFrame({
  lang,
  backHref,
  title,
  titleAside,
  description,
  search,
  children,
}: {
  lang: Lang;
  backHref?: string;
  title: string;
  titleAside?: ReactNode;
  description?: string;
  search?: Record<string, string | string[] | undefined>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
      {backHref ? (
        <Link className="text-sm text-sky-300 hover:text-sky-200" href={backHref}>
          {t(lang, "back")}
        </Link>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {titleAside}
      </div>
      {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      {search ? <Flash lang={lang} search={search} /> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Flash({ lang, search }: { lang: Lang; search: Record<string, string | string[] | undefined> }) {
  const error = firstParam(search.error);
  const created = firstParam(search.created);
  const updated = firstParam(search.updated);
  const warn = firstParam(search.warn);
  const jobs = firstParam(search.jobs);
  if (!error && !created && !updated && !warn) return null;
  const errorText =
    error === "required"
      ? t(lang, "errorRequired")
      : error === "date" || error === "link"
        ? error === "link"
          ? t(lang, "eventNeedsLink")
          : t(lang, "errorDate")
        : error === "import"
          ? t(lang, "errorImport")
          : error === "storage"
            ? t(lang, "errorStorage")
          : error === "auth"
            ? t(lang, "authError")
            : error === "empty"
              ? t(lang, "errorEmpty")
              : error === "mismatch"
                ? t(lang, "errorMismatch")
                : error === "same"
                  ? t(lang, "errorSame")
                  : error === "current"
                    ? t(lang, "errorCurrent")
                    : error === "policy"
                      ? policyMessage(lang, firstParam(search.rule))
                      : error === "contacts"
                        ? t(lang, "errorGoogleContacts")
                        : error === "contacts-scope"
                          ? t(lang, "errorGoogleContactsScope")
                        : error === "tagName"
                          ? t(lang, "errorTagName")
                          : error === "aiKey"
                            ? t(lang, "errorAiKey")
                            : error === "aiBalance"
                              ? t(lang, "errorAiBalance")
                              : error === "aiProvider"
                                ? t(lang, "errorAiProvider")
                                : error === "aiPdf"
                                  ? t(lang, "errorAiPdf")
                                  : error === "stripe"
                                    ? t(lang, "errorStripe")
                      : error
                        ? t(lang, "errorGeneric")
                        : "";
  return (
    <div className="mt-3 space-y-2">
      {errorText ? <p className="rounded-md border border-rose-700 px-3 py-2 text-sm text-rose-200">{errorText}</p> : null}
      {created ? (
        <p className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-200">
          {jobs ? `${t(lang, "importDone")} ${jobs} ${t(lang, "jobsCount")}, ${firstParam(search.contacts)} ${t(lang, "contactsCount")}, ${firstParam(search.events)} ${t(lang, "eventsCount")}.` : t(lang, "created")}
        </p>
      ) : null}
      {updated ? <p className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-200">{t(lang, "updated")}</p> : null}
      {warn === "calendar" ? <p className="rounded-md border border-amber-600 px-3 py-2 text-sm text-amber-100">{t(lang, "warnCalendar")}</p> : null}
    </div>
  );
}

function policyMessage(lang: Lang, rule: string) {
  if (rule === "length" || rule === "lower" || rule === "upper" || rule === "digit") {
    const key = rule === "length" ? "ruleLength" : rule === "lower" ? "ruleLower" : rule === "upper" ? "ruleUpper" : "ruleDigit";
    return t(lang, key as MessageKey);
  }
  return t(lang, "errorGeneric");
}

export function Modal({ title, closeHref, closeLabel, children }: { title: string; closeHref: string; closeLabel: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/75 p-4">
      <div className="mt-8 w-full max-w-2xl rounded-xl bg-slate-900 p-4 ring-1 ring-slate-700">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-sky-300" href={closeHref}>
              {closeLabel}
            </Link>
            <Link className="text-xl leading-none text-slate-300" href={closeHref} aria-label={closeLabel}>
              ×
            </Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-slate-700 px-4 py-8 text-center text-sm text-slate-300">{children}</div>;
}

export function statusClass(status: string) {
  if (status === "offer") return "text-emerald-400";
  if (status === "rejected") return "text-rose-400";
  if (status === "not_applicable") return "text-slate-400";
  if (status === "parked") return "text-slate-500";
  if (status === "interviewing") return "text-amber-300";
  if (status === "applied" || status === "contacted") return "text-sky-300";
  return "text-slate-200";
}

export function statusChipClass(status: string) {
  if (status === "interest") return "bg-indigo-400 text-indigo-950";
  if (status === "contacted") return "bg-sky-400 text-sky-950";
  if (status === "applied") return "bg-cyan-400 text-cyan-950";
  if (status === "interviewing") return "bg-amber-300 text-amber-950";
  if (status === "offer") return "bg-emerald-400 text-emerald-950";
  if (status === "rejected") return "bg-rose-400 text-rose-950";
  if (status === "withdrawn") return "bg-orange-400 text-orange-950";
  if (status === "on_hold") return "bg-violet-400 text-violet-950";
  if (status === "not_applicable") return "bg-slate-400 text-slate-950";
  if (status === "parked") return "bg-zinc-400 text-zinc-950";
  return "bg-slate-300 text-slate-950";
}
