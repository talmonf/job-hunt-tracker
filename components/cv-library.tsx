"use client";

import { useState } from "react";
import { prepareProfileImport } from "@/lib/actions/ai";
import { deleteProfileFile } from "@/lib/actions/profile";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export function CvLibrary({
  files,
  lang,
  defaultLanguage,
  paySource,
}: {
  files: { id: string; filename: string; uploadedOn: string }[];
  lang: Lang;
  defaultLanguage: Lang;
  paySource: string;
}) {
  const [selected, setSelected] = useState(0);
  if (!files.length) return null;
  return (
    <>
      <form
        action={prepareProfileImport}
        className="grid gap-3"
        onChange={(event) => setSelected(new FormData(event.currentTarget).getAll("fileId").length)}
      >
        <ul className="max-h-80 overflow-y-auto rounded-md border border-slate-700">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 border-b border-slate-800 px-2 py-1 text-sm last:border-b-0">
              <input type="checkbox" name="fileId" value={file.id} />
              <a className="min-w-0 flex-1 truncate text-sky-300" href={`/files/profile/${file.id}`}>{file.filename}</a>
              <span className="shrink-0 text-slate-400">{file.uploadedOn}</span>
              <button className="shrink-0 text-rose-300" type="submit" form={`delete-file-${file.id}`}>{t(lang, "delete")}</button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <label>
            <span className={labelClass}>{t(lang, "outputLanguage")}</span>
            <select className={fieldClass} name="language" defaultValue={defaultLanguage}>
              <option value="en">{t(lang, "languageEn")}</option>
              <option value="he">{t(lang, "languageHe")}</option>
              <option value="both">{t(lang, "languageBoth")}</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>{t(lang, "provider")}</span>
            <select className={fieldClass} name="provider" defaultValue="openrouter">
              {AI_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>{t(lang, "paySource")}</span>
            <select className={fieldClass} name="paySource" defaultValue={paySource}>
              <option value="key">{t(lang, "payWithKey")}</option>
              <option value="credits">{t(lang, "payWithCredits")}</option>
            </select>
          </label>
        </div>
        <SubmitButton label={t(lang, "importSelected")} thin disabled={selected === 0} />
      </form>
      {files.map((file) => (
        <form key={file.id} id={`delete-file-${file.id}`} action={deleteProfileFile}>
          <input type="hidden" name="id" value={file.id} />
        </form>
      ))}
    </>
  );
}
