"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import {
  TAG_PALETTE,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  isLightTagColor,
  normalizeTagColor,
  rgbToHex,
  suggestTagColors,
  tagSwatchStyle,
  type TagPaletteId,
} from "@/lib/tags";
import { labelClass } from "@/components/widgets";

const SWATCH_LABEL: Record<Lang, Record<TagPaletteId, string>> = {
  en: {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    lime: "Lime",
    green: "Green",
    teal: "Teal",
    blue: "Blue",
    navy: "Navy",
    violet: "Violet",
    magenta: "Magenta",
    pink: "Pink",
    maroon: "Maroon",
    brown: "Brown",
    gray: "Gray",
    white: "White",
    black: "Black",
  },
  he: {
    red: "אדום",
    orange: "כתום",
    yellow: "צהוב",
    lime: "ירוק בהיר",
    green: "ירוק",
    teal: "טורקיז",
    blue: "כחול",
    navy: "כחול כהה",
    violet: "סגול",
    magenta: "מג'נטה",
    pink: "ורוד",
    maroon: "בורדו",
    brown: "חום",
    gray: "אפור",
    white: "לבן",
    black: "שחור",
  },
};

const HUE_GRADIENT = "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function swatchName(lang: Lang, color: string) {
  const hex = normalizeTagColor(color);
  const match = TAG_PALETTE.find((item) => item.hex === hex);
  return match ? SWATCH_LABEL[lang][match.id] : (hex ?? color);
}

function Swatch({
  color,
  selected,
  label,
  panel,
  onClick,
}: {
  color: string;
  selected: boolean;
  label: string;
  panel?: boolean;
  onClick: () => void;
}) {
  const ring = selected ? (isLightTagColor(color) ? "ring-sky-400" : "ring-white") : "ring-transparent";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={`h-6 w-6 shrink-0 rounded-full border border-white/30 ring-2 ring-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${panel ? "ring-offset-slate-900" : "ring-offset-slate-950"} ${ring}`}
      style={tagSwatchStyle(color)}
      onClick={onClick}
    />
  );
}

function HexField({ color, label, onChange }: { color: string; label: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(color);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(color);
  }, [color, focused]);
  function commit(raw: string) {
    const next = normalizeTagColor(raw);
    if (next) onChange(next);
    else setDraft(color);
  }
  return (
    <input
      aria-label={label}
      dir="ltr"
      spellCheck={false}
      autoComplete="off"
      maxLength={22}
      value={draft}
      className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-slate-100 outline-none focus:border-sky-500"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        setFocused(false);
        commit(event.target.value);
      }}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (/^#?[0-9a-f]{6}$/i.test(text.trim())) {
          const next = normalizeTagColor(text);
          if (next) onChange(next);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(draft);
        }
      }}
    />
  );
}

function ChannelField({
  letter,
  label,
  value,
  onChange,
}: {
  letter: string;
  label: string;
  value: number;
  onChange: (channel: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  function commit(raw: string) {
    if (/^\d{1,3}$/.test(raw) && Number(raw) <= 255) onChange(Number(raw));
    else setDraft(String(value));
  }
  return (
    <label className="flex items-center gap-1">
      <span className="text-[11px] text-slate-400">{letter}</span>
      <input
        aria-label={label}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-1 py-0.5 text-center font-mono text-xs text-slate-100 outline-none focus:border-sky-500"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false);
          commit(event.target.value);
        }}
        onChange={(event) => {
          const text = event.target.value.replace(/\D/g, "").slice(0, 3);
          setDraft(text);
          if (/^\d{1,3}$/.test(text) && Number(text) <= 255) onChange(Number(text));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
        }}
      />
    </label>
  );
}

function TagSpectrum({ lang, color, onChange }: { lang: Lang; color: string; onChange: (hex: string) => void }) {
  const hsv = hexToHsv(color) ?? { h: 0, s: 1, v: 1 };
  const [hue, setHue] = useState(hsv.h);
  useEffect(() => {
    const next = hexToHsv(color);
    if (!next || next.s <= 0.02) return;
    setHue((current) => (hsvToHex(current, next.s, next.v) === color ? current : next.h));
  }, [color]);

  function paint(nextHue: number, s: number, v: number) {
    setHue(nextHue);
    onChange(hsvToHex(nextHue, s, v));
  }

  function moveSquare(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const s = rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0;
    const v = rect.height ? clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1) : 0;
    paint(hue, s, v);
  }

  function moveHue(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360 : 0;
    paint(next, hsv.s, hsv.v);
  }

  function capture(event: ReactPointerEvent<HTMLDivElement>, move: (event: ReactPointerEvent<HTMLDivElement>) => void) {
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event);
  }

  function onSquareKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.02;
    let s = hsv.s;
    let v = hsv.v;
    if (event.key === "ArrowLeft") s -= step;
    else if (event.key === "ArrowRight") s += step;
    else if (event.key === "ArrowDown") v -= step;
    else if (event.key === "ArrowUp") v += step;
    else return;
    event.preventDefault();
    paint(hue, clamp(s, 0, 1), clamp(v, 0, 1));
  }

  function onHueKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 12 : 2;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -step : step;
    paint((hue + delta + 360) % 360, hsv.s, hsv.v);
  }

  const channels = hexToRgb(color) ?? { r: 239, g: 68, b: 68 };

  function setChannel(channel: "r" | "g" | "b", value: number) {
    const next = { ...channels, [channel]: value };
    onChange(rgbToHex(next.r, next.g, next.b));
  }

  return (
    <div dir="ltr" className="space-y-2">
      <div
        role="slider"
        aria-label={t(lang, "tagSpectrum")}
        aria-valuetext={color}
        tabIndex={0}
        className="relative h-32 w-full cursor-crosshair touch-none overflow-hidden rounded-md border border-slate-600 outline-none focus-visible:border-sky-500"
        style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
        onPointerDown={(event) => capture(event, moveSquare)}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) moveSquare(event);
        }}
        onKeyDown={onSquareKey}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.65)]"
          style={{
            left: `calc(${hsv.s} * (100% - 14px) + 7px)`,
            top: `calc(${1 - hsv.v} * (100% - 14px) + 7px)`,
          }}
        />
      </div>
      <div
        role="slider"
        aria-label={t(lang, "tagHue")}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        tabIndex={0}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        style={{ backgroundImage: HUE_GRADIENT }}
        onPointerDown={(event) => capture(event, moveHue)}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) moveHue(event);
        }}
        onKeyDown={onHueKey}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.65)]"
          style={{ left: `calc(${hue / 360} * (100% - 16px) + 8px)`, backgroundColor: `hsl(${hue}, 100%, 50%)` }}
        />
      </div>
      <label className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">{t(lang, "tagHex")}</span>
        <HexField color={color} label={t(lang, "tagHex")} onChange={onChange} />
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        <ChannelField letter="R" label={t(lang, "tagRed")} value={channels.r} onChange={(value) => setChannel("r", value)} />
        <ChannelField letter="G" label={t(lang, "tagGreen")} value={channels.g} onChange={(value) => setChannel("g", value)} />
        <ChannelField letter="B" label={t(lang, "tagBlue")} value={channels.b} onChange={(value) => setChannel("b", value)} />
      </div>
    </div>
  );
}

export function TagColorChoices({
  lang,
  color,
  used,
  onChange,
}: {
  lang: Lang;
  color: string;
  used: Iterable<string>;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = normalizeTagColor(color) ?? TAG_PALETTE[0].hex;
  const suggestions = suggestTagColors(used, current);
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
  useEffect(() => {
    if (!open || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setAbove(spaceBelow < 360 && rect.top > spaceBelow);
  }, [open]);
  return (
    <div ref={root} className="relative">
      <span className={labelClass}>{t(lang, "tagColor")}</span>
      <div dir="ltr" className="flex items-center gap-2">
        {suggestions.map((item) => (
          <Swatch key={item} color={item} selected={item === current} label={swatchName(lang, item)} onClick={() => onChange(item)} />
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
      <input type="hidden" name="color" value={current} />
      {open ? (
        <div
          id={panelId}
          className={`absolute start-0 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-slate-600 bg-slate-900 p-2 shadow-lg ${above ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          <div dir="ltr" className="grid grid-cols-8 justify-items-center gap-1.5">
            {TAG_PALETTE.map((item) => (
              <Swatch
                key={item.id}
                color={item.hex}
                selected={item.hex === current}
                label={SWATCH_LABEL[lang][item.id]}
                panel
                onClick={() => {
                  onChange(item.hex);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <div className="mt-2 border-t border-slate-700 pt-2">
            <div className="mb-1.5 text-[11px] text-slate-400">{t(lang, "tagSpectrum")}</div>
            <TagSpectrum lang={lang} color={current} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
