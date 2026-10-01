"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { maskText } from "@/lib/mask";
import { TAG_CHIP_CLASS, type TagRef } from "@/lib/tags";
import { fieldClass, quietButton } from "./widgets";

export function TagPicker({
  lang,
  hide,
  tags,
  selected,
}: {
  lang: Lang;
  hide: boolean;
  tags: TagRef[];
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState(selected);
  const byId = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const chosen = ids.flatMap((id) => {
    const tag = byId.get(id);
    return tag ? [tag] : [];
  });
  const rest = tags.filter((tag) => !ids.includes(tag.id));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-300">{t(lang, "tags")}</span>
        <Link className="text-xs text-sky-300" href="/settings">
          {t(lang, "manageTags")}
        </Link>
      </div>
      {tags.length === 0 ? <p className="text-sm text-slate-400">{t(lang, "noTagsYet")}</p> : null}
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
      <input type="hidden" name="tagsManaged" value="1" />
      {ids.map((id) => (
        <input key={id} type="hidden" name="tagId" value={id} />
      ))}
    </div>
  );
}
