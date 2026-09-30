"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { fieldClass, labelClass, quietButton } from "./widgets";

type Row = { key: string; url: string };

export function JobUrlsEditor({
  lang,
  initialUrls,
}: {
  lang: Lang;
  initialUrls?: { id?: string; url: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (initialUrls ?? []).map((item, index) => ({ key: item.id ?? `url-${index}`, url: item.url })),
  );
  const [draft, setDraft] = useState("");

  function addDraft() {
    const url = draft.trim();
    if (!url) return;
    setRows((current) => [...current, { key: `new-${Date.now()}`, url }]);
    setDraft("");
  }

  return (
    <div>
      <span className={labelClass}>{t(lang, "urls")}</span>
      <input type="hidden" name="urlsManaged" value="1" />
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <input
              className={fieldClass}
              name="urls"
              value={row.url}
              onChange={(event) => {
                const url = event.target.value;
                setRows((current) => current.map((item) => (item.key === row.key ? { ...item, url } : item)));
              }}
            />
            <button
              className="shrink-0 text-sm text-rose-300"
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
            >
              {t(lang, "delete")}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className={fieldClass}
          name="urls"
          value={draft}
          placeholder="https://"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
        />
        <button className={quietButton} type="button" onClick={addDraft}>
          {t(lang, "add")}
        </button>
      </div>
    </div>
  );
}
