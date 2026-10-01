"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { TagColor } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { TAG_CHIP_CLASS, TAG_COLORS, TAG_SWATCH_CLASS, firstFreeTagColor, suggestTagColors } from "@/lib/tags";
import { SettingsSection } from "@/components/settings-section";
import { fieldClass, labelClass, primaryButton } from "@/components/widgets";

type TagRow = { id: string; name: string; color: TagColor };

type TagUsage = {
  jobs: string[];
  contacts: string[];
  notes: string[];
  employments: string[];
};

function byName(a: TagRow, b: TagRow) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function messageFor(lang: Lang, error: string | undefined) {
  if (error === "tagName") return t(lang, "errorTagName");
  return t(lang, "errorRequired");
}

async function sendTag(method: "POST" | "PATCH" | "DELETE", body: FormData) {
  const response = await fetch("/api/tags", { method, body });
  const data = (await response.json().catch(() => null)) as { tag?: TagRow; error?: string; usage?: TagUsage } | null;
  return { ok: response.ok, tag: data?.tag, error: data?.error, usage: data?.usage };
}

function TagColorChoices({
  lang,
  color,
  used,
  onChange,
}: {
  lang: Lang;
  color: TagColor;
  used: Iterable<TagColor>;
  onChange: (color: TagColor) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const suggestions = suggestTagColors(used, color);
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
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={item}
            aria-pressed={item === color}
            className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-950 ${TAG_SWATCH_CLASS[item]} ${item === color ? "ring-white" : "ring-transparent"}`}
            onClick={() => onChange(item)}
          />
        ))}
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

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
      <path d="M13.2 2.8a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1l-8.3 8.3-3.6.7.6-3.7 7.3-9.3Z" />
      <path d="M3 17.2h14v1.3H3z" />
    </svg>
  );
}

function UsageGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <div className="text-xs text-slate-400">{title}</div>
      <ul className="list-disc ps-5">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TagEditor({
  lang,
  tag,
  used,
  onSaved,
  onDeleted,
  onClose,
}: {
  lang: Lang;
  tag: TagRow;
  used: TagColor[];
  onSaved: (tag: TagRow) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TagUsage | null>(null);

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
    onSaved(result.tag);
    onClose();
  }

  async function remove(confirmed = false) {
    setPending("delete");
    setError(null);
    const body = new FormData();
    body.set("id", tag.id);
    if (confirmed) body.set("confirm", "1");
    const result = await sendTag("DELETE", body);
    setPending(null);
    if (result.error === "used" && result.usage) {
      setUsage(result.usage);
      return;
    }
    if (!confirmed && result.error === "confirm") {
      if (!window.confirm(t(lang, "deleteTagConfirm"))) return;
      await remove(true);
      return;
    }
    if (!result.ok) {
      setError(messageFor(lang, result.error));
      return;
    }
    onDeleted(tag.id);
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-slate-700 p-3">
      <input type="hidden" name="id" value={tag.id} />
      <label>
        <span className={labelClass}>{t(lang, "tagName")}</span>
        <input className={fieldClass} name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <TagColorChoices lang={lang} color={color} used={used} onChange={setColor} />
      <BusyButton label={t(lang, "save")} pending={pending === "save"} disabled={pending === "delete"} />
      {usage ? (
        <div className="basis-full rounded-md border border-amber-700 p-3 text-sm text-amber-100">
          <p>{t(lang, "deleteTagUsed")}</p>
          <UsageGroup title={t(lang, "jobs")} items={usage.jobs} />
          <UsageGroup title={t(lang, "networking")} items={usage.contacts} />
          <UsageGroup title={t(lang, "notes")} items={usage.notes} />
          <UsageGroup title={t(lang, "employment")} items={usage.employments} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="text-sm text-rose-300 disabled:opacity-60" type="button" onClick={() => remove(true)} disabled={pending !== null}>
              {t(lang, "deleteTagContinue")}
            </button>
            <button className="text-sm text-slate-300" type="button" onClick={() => setUsage(null)} disabled={pending !== null}>
              {t(lang, "close")}
            </button>
          </div>
        </div>
      ) : (
        <button className="text-sm text-rose-300 disabled:opacity-60" type="button" onClick={() => remove(false)} disabled={pending !== null}>
          {t(lang, "delete")}
        </button>
      )}
      {error ? <p className="basis-full text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}

export function TagSettings({ lang, tags: initial }: { lang: Lang; tags: TagRow[] }) {
  const [tags, setTags] = useState(initial);
  const [color, setColor] = useState<TagColor>(() => firstFreeTagColor(initial.map((tag) => tag.color)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const used = useMemo(() => tags.map((tag) => tag.color), [tags]);
  const editing = tags.find((tag) => tag.id === editingId) ?? null;

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
    const next = [...tags, result.tag].sort(byName);
    setTags(next);
    form.reset();
    setColor(firstFreeTagColor(next.map((tag) => tag.color)));
  }

  return (
    <SettingsSection title={t(lang, "tags")} badge={String(tags.length)}>
      <p className="mb-3 text-sm text-slate-400">{t(lang, "tagsIntro")}</p>
      <ul className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <li key={tag.id} className="inline-flex items-center gap-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[tag.color]} ${tag.id === editingId ? "ring-2 ring-white" : ""}`}>
              {tag.name}
            </span>
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label={t(lang, "edit")}
              aria-pressed={tag.id === editingId}
              onClick={() => setEditingId((current) => (current === tag.id ? null : tag.id))}
            >
              <PencilIcon />
            </button>
          </li>
        ))}
      </ul>
      {editing ? (
        <TagEditor
          key={editing.id}
          lang={lang}
          tag={editing}
          used={tags.filter((tag) => tag.id !== editing.id).map((tag) => tag.color)}
          onSaved={(saved) => setTags((rows) => rows.map((row) => (row.id === saved.id ? saved : row)).sort(byName))}
          onDeleted={(id) => {
            setTags((rows) => rows.filter((row) => row.id !== id));
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      ) : null}
      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "addTag")}</span>
          <input className={fieldClass} name="name" required />
        </label>
        <TagColorChoices lang={lang} color={color} used={used} onChange={setColor} />
        <BusyButton label={t(lang, "add")} pending={pending} />
      </form>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SettingsSection>
  );
}
