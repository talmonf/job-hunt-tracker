"use client";

import { useState } from "react";
import { addProposedJobTag, fillJobFromDescription, type FillJobError } from "@/lib/actions/job-fill";
import { t, type Lang, type MessageKey } from "@/lib/i18n";
import { JOB_TAGS_ADD_EVENT, type JobTagsAddDetail } from "./tag-picker";
import { primaryButton } from "./widgets";

function errorKey(error: FillJobError): MessageKey {
  if (error === "aiKey") return "errorAiKey";
  if (error === "aiBalance") return "errorAiBalance";
  if (error === "aiGrant") return "errorAiGrant";
  if (error === "empty") return "fillJobDetailsEmpty";
  return "errorAiProvider";
}

function setField(form: HTMLFormElement, name: string, value: string) {
  if (!value) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
    field.value = value;
  }
}

function AiIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M8 1.2 9.15 6.15 14 8 9.15 9.85 8 14.8 6.85 9.85 2 8 6.85 6.15Z" />
    </svg>
  );
}

export function FillJobDetails({ lang }: { lang: Lang }) {
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [proposed, setProposed] = useState<string[]>([]);

  async function fill() {
    const form = document.getElementById("job-form");
    if (!(form instanceof HTMLFormElement)) return;
    const description = form.elements.namedItem("description");
    const text = description instanceof HTMLTextAreaElement ? description.value.trim() : "";
    if (!text) {
      setError("fillJobDetailsEmpty");
      setProposed([]);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await fillJobFromDescription(text);
      if (!result.ok) {
        setError(errorKey(result.error));
        return;
      }
      setField(form, "companyName", result.fields.companyName);
      setField(form, "title", result.fields.title);
      setField(form, "location", result.fields.location);
      setField(form, "employmentType", result.fields.employmentType);
      setField(form, "workArrangement", result.fields.workArrangement);
      setField(form, "engagement", result.fields.engagement);
      if (result.tagIds.length) {
        const detail: JobTagsAddDetail = { ids: result.tagIds };
        window.dispatchEvent(new CustomEvent(JOB_TAGS_ADD_EVENT, { detail }));
      }
      setProposed(result.proposedTags);
    } catch {
      setError("errorAiProvider");
    } finally {
      setPending(false);
    }
  }

  async function add(name: string) {
    setAdding(name);
    setError(null);
    try {
      const result = await addProposedJobTag(name);
      if (!result.ok) {
        setError(result.error === "tagName" ? "errorTagName" : "errorGeneric");
        return;
      }
      const detail: JobTagsAddDetail = { ids: [result.tag.id], tags: [result.tag] };
      window.dispatchEvent(new CustomEvent(JOB_TAGS_ADD_EVENT, { detail }));
      setProposed((current) => current.filter((item) => item !== name));
    } catch {
      setError("errorGeneric");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="mb-3">
      <button className={`${primaryButton} inline-flex items-center gap-2`} type="button" onClick={fill} disabled={pending} aria-busy={pending}>
        {pending ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        ) : (
          <AiIcon />
        )}
        {t(lang, "fillJobDetails")}
      </button>
      <p className="mt-1 text-xs text-slate-400">{t(lang, "fillJobDetailsHint")}</p>
      {error ? <p className="mt-2 rounded-md border border-rose-700 px-3 py-2 text-sm text-rose-200">{t(lang, error)}</p> : null}
      {proposed.length ? (
        <div className="mt-2">
          <p className="mb-1 text-xs text-slate-300">{t(lang, "proposedTags")}</p>
          <ul className="flex flex-wrap gap-2">
            {proposed.map((name) => (
              <li key={name} className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-100">
                <span>{name}</span>
                <button className="text-sky-300 disabled:opacity-60" type="button" onClick={() => add(name)} disabled={adding === name}>
                  {t(lang, "add")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
