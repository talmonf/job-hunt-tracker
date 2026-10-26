"use client";

import { useState } from "react";

const chooseButton =
  "rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-white";

export function FilePicker({
  name,
  accept,
  required = false,
  chooseLabel,
  emptyLabel,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  chooseLabel: string;
  emptyLabel: string;
}) {
  const [fileName, setFileName] = useState("");
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <label className="relative inline-flex cursor-pointer overflow-hidden rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500">
        <input
          name={name}
          type="file"
          accept={accept}
          required={required}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
        <span className={chooseButton}>{chooseLabel}</span>
      </label>
      <span
        className="min-w-0 max-w-36 truncate text-sm text-slate-300"
        dir={fileName ? "ltr" : undefined}
        title={fileName || undefined}
      >
        {fileName || emptyLabel}
      </span>
    </span>
  );
}
