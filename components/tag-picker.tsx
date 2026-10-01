"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { maskText } from "@/lib/mask";
import { TAG_CHIP_CLASS, type TagRef } from "@/lib/tags";
import { fieldClass, quietButton } from "./widgets";

export const JOB_TAGS_ADD_EVENT = "job-tags-add";

export type JobTagsAddDetail = {
  ids: string[];
  tags?: TagRef[];
};

export function TagPicker({
  lang,
  hide,
  tags,
  selected,
  compact = false,
}: {
  lang: Lang;
  hide: boolean;
  tags: TagRef[];
  selected: string[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState(tags);
  const [ids, setIds] = useState(selected);
  useEffect(() => {
    function onAdd(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as JobTagsAddDetail | undefined;
      if (!detail) return;
      if (detail.tags?.length) {
        setCatalog((current) => {
          const known = new Set(current.map((tag) => tag.id));
          const extra = detail.tags!.filter((tag) => !known.has(tag.id));
          return extra.length ? [...current, ...extra] : current;
        });
      }
      if (detail.ids?.length) {
        setIds((current) => {
          const next = [...current];
          for (const id of detail.ids) {
            if (!next.includes(id)) next.push(id);
          }
          return next.length === current.length ? current : next;
        });
      }
    }
    window.addEventListener(JOB_TAGS_ADD_EVENT, onAdd);
    return () => window.removeEventListener(JOB_TAGS_ADD_EVENT, onAdd);
  }, []);
  const byId = useMemo(() => new Map(catalog.map((tag) => [tag.id, tag])), [catalog]);
  const chosen = ids.flatMap((id) => {
    const tag = byId.get(id);
    return tag ? [tag] : [];
  });
  const rest = catalog.filter((tag) => !ids.includes(tag.id));
  const fields = (
    <>
      <input type="hidden" name="tagsManaged" value="1" />
      {ids.map((id) => (
        <input key={id} type="hidden" name="tagId" value={id} />
      ))}
    </>
  );
  if (compact) {
    const ordered = [...chosen, ...rest];
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {chosen.map((tag) => (
            <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[tag.color]}`}>
              {maskText(tag.name, hide)}
              <button
                className="leading-none"
                type="button"
                aria-label={t(lang, "delete")}
                onClick={() => setIds((current) => current.filter((id) => id !== tag.id))}
              >
                ×
              </button>
            </span>
          ))}
          {catalog.length ? (
            <div className="relative">
              <button
                className="rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800"
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                {t(lang, "tags")}
              </button>
              {open ? (
                <div className="absolute z-20 mt-1 w-64 rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg">
                  <div className="max-h-48 space-y-1 overflow-auto">
                    {ordered.map((tag) => {
                      const on = ids.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          className="flex w-full items-center gap-2 rounded px-1 py-1 text-start text-sm hover:bg-slate-800"
                          type="button"
                          onClick={() =>
                            setIds((current) => (on ? current.filter((id) => id !== tag.id) : [...current, tag.id]))
                          }
                        >
                          <span className="w-4 shrink-0 text-xs text-slate-300">{on ? "✓" : ""}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[tag.color]}`}>
                            {maskText(tag.name, hide)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button className={`${quietButton} mt-2`} type="button" onClick={() => setOpen(false)}>
                    {t(lang, "done")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t(lang, "noTagsYet")}</p>
          )}
          <Link className="text-xs text-sky-300" href="/settings">
            {t(lang, "manageTags")}
          </Link>
        </div>
        {fields}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-300">{t(lang, "tags")}</span>
        <Link className="text-xs text-sky-300" href="/settings">
          {t(lang, "manageTags")}
        </Link>
      </div>
      {catalog.length === 0 ? <p className="text-sm text-slate-400">{t(lang, "noTagsYet")}</p> : null}
      {chosen.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {chosen.map((tag) => (
            <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[tag.color]}`}>
              {maskText(tag.name, hide)}
              <button
                className="leading-none"
                type="button"
                aria-label={t(lang, "delete")}
                onClick={() => setIds((current) => current.filter((id) => id !== tag.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {rest.length ? (
        <div className="relative">
          <button className={`${fieldClass} text-start`} type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {t(lang, "addTag")}
          </button>
          {open ? (
            <div className="absolute z-20 mt-1 w-64 rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg">
              <div className="max-h-48 space-y-1 overflow-auto">
                {rest.map((tag) => (
                  <button
                    key={tag.id}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-start text-sm hover:bg-slate-800"
                    type="button"
                    onClick={() => {
                      setIds((current) => [...current, tag.id]);
                      setOpen(false);
                    }}
                  >
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[tag.color]}`}>
                      {maskText(tag.name, hide)}
                    </span>
                  </button>
                ))}
              </div>
              <button className={`${quietButton} mt-2`} type="button" onClick={() => setOpen(false)}>
                {t(lang, "done")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {fields}
    </div>
  );
}
