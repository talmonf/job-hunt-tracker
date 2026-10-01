"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { TagColor } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { TAG_COLORS, TAG_SWATCH_CLASS } from "@/lib/tags";
import { SettingsSection } from "@/components/settings-section";
import { fieldClass, labelClass, primaryButton } from "@/components/widgets";

type TagRow = { id: string; name: string; color: TagColor };

function byName(a: TagRow, b: TagRow) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function messageFor(lang: Lang, error: string | undefined) {
  if (error === "tagName") return t(lang, "errorTagName");
  return t(lang, "errorRequired");
}

async function sendTag(method: "POST" | "PATCH" | "DELETE", body: FormData) {
  const response = await fetch("/api/tags", { method, body });
  const data = (await response.json().catch(() => null)) as { tag?: TagRow; error?: string } | null;
  return { ok: response.ok, tag: data?.tag, error: data?.error };
}

function TagColorField({
  lang,
  color,
  onChange,
}: {
  lang: Lang;
  color: TagColor;
  onChange: (color: TagColor) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <span className={labelClass}>{t(lang, "tagColor")}</span>
      <div className="flex items-center gap-2">
        <span className={`block h-6 w-6 rounded-full ${TAG_SWATCH_CLASS[color]}`} aria-hidden="true" />
        <button
          type="button"
          className="rounded-md border border-slate-600 p-1.5 text-slate-200 hover:bg-slate-800"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t(lang, "tagPalette")}
          onClick={() => setOpen((value) => !value)}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
            <rect x="2" y="2" width="6" height="6" rx="1" />
            <rect x="12" y="2" width="6" height="6" rx="1" />
            <rect x="2" y="12" width="6" height="6" rx="1" />
            <rect x="12" y="12" width="6" height="6" rx="1" />
          </svg>
        </button>
      </div>
      <input type="hidden" name="color" value={color} />
      {open ? (
        <div id={panelId} className="absolute start-0 top-full z-20 mt-1 grid grid-cols-6 gap-2 rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg">
          {TAG_COLORS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item}
              aria-pressed={item === color}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 ${TAG_SWATCH_CLASS[item]} ${item === color ? "ring-white" : "ring-transparent"}`}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BusyButton({ label, pending, disabled = false }: { label: string; pending: boolean; disabled?: boolean }) {
  return (
    <button className={`${primaryButton} inline-flex items-center gap-2`} disabled={pending || disabled} type="submit" aria-busy={pending}>
      {pending ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {label}
    </button>
  );
}

function TagEditor({
  lang,
  tag,
  onSaved,
  onDeleted,
}: {
  lang: Lang;
  tag: TagRow;
  onSaved: (tag: TagRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError(null);
    const result = await sendTag("PATCH", new FormData(event.currentTarget));
    setPending(null);
    if (!result.ok || !result.tag) {
      setError(messageFor(lang, result.error));
      return;
    }
    setName(result.tag.name);
    setColor(result.tag.color);
    onSaved(result.tag);
  }

  async function remove() {
    if (!window.confirm(t(lang, "deleteTagConfirm"))) return;
    setPending("delete");
    setError(null);
    const body = new FormData();
    body.set("id", tag.id);
    const result = await sendTag("DELETE", body);
    setPending(null);
    if (!result.ok) {
      setError(messageFor(lang, result.error));
      return;
    }
    onDeleted(tag.id);
  }

  return (
    <li className="rounded-md border border-slate-700 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={tag.id} />
          <label>
            <span className={labelClass}>{t(lang, "tagName")}</span>
            <input className={fieldClass} name="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <TagColorField lang={lang} color={color} onChange={setColor} />
          <BusyButton label={t(lang, "save")} pending={pending === "save"} disabled={pending === "delete"} />
        </form>
        <button className="text-sm text-rose-300 disabled:opacity-60" type="button" onClick={remove} disabled={pending !== null}>
          {t(lang, "delete")}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </li>
  );
}

export function TagSettings({ lang, tags: initial }: { lang: Lang; tags: TagRow[] }) {
  const [tags, setTags] = useState(initial);
  const [color, setColor] = useState<TagColor>("sky");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const result = await sendTag("POST", new FormData(form));
    setPending(false);
    if (!result.ok || !result.tag) {
      setError(messageFor(lang, result.error));
      return;
    }
    setTags((rows) => [...rows, result.tag as TagRow].sort(byName));
    form.reset();
    setColor("sky");
  }

  return (
    <SettingsSection title={t(lang, "tags")} badge={String(tags.length)}>
      <p className="mb-3 text-sm text-slate-400">{t(lang, "tagsIntro")}</p>
      <ul className="mb-4 space-y-3">
        {tags.map((tag) => (
          <TagEditor
            key={tag.id}
            lang={lang}
            tag={tag}
            onSaved={(saved) => setTags((rows) => rows.map((row) => (row.id === saved.id ? saved : row)).sort(byName))}
            onDeleted={(id) => setTags((rows) => rows.filter((row) => row.id !== id))}
          />
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "addTag")}</span>
          <input className={fieldClass} name="name" required />
        </label>
        <TagColorField lang={lang} color={color} onChange={setColor} />
        <BusyButton label={t(lang, "add")} pending={pending} />
      </form>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SettingsSection>
  );
}
