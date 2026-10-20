"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { fieldClass, labelClass } from "@/components/widgets";

export function SkillNamesEditor({ lang, names }: { lang: Lang; names: string[] }) {
  const [rows, setRows] = useState(() => names.map((name, index) => ({ id: index + 1, name })));
  const [extra, setExtra] = useState("");
  return (
    <div className="grid gap-2">
      <input type="hidden" name="skillCount" value={rows.length + 1} />
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            className={fieldClass}
            name={`skill_${index}_name`}
            value={row.name}
            onChange={(event) =>
              setRows((current) => current.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)))
            }
          />
          <button
            className="shrink-0 text-sm text-rose-300"
            type="button"
            aria-label={t(lang, "delete")}
            onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
          >
            ×
          </button>
        </div>
      ))}
      <label className="max-w-md">
        <span className={labelClass}>{t(lang, "addTag")}</span>
        <input className={fieldClass} name={`skill_${rows.length}_name`} value={extra} onChange={(event) => setExtra(event.target.value)} />
      </label>
    </div>
  );
}
