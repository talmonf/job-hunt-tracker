export const TAG_PALETTE = [
  { id: "red", hex: "#ef4444" },
  { id: "orange", hex: "#f97316" },
  { id: "yellow", hex: "#eab308" },
  { id: "lime", hex: "#84cc16" },
  { id: "green", hex: "#22c55e" },
  { id: "teal", hex: "#14b8a6" },
  { id: "blue", hex: "#3b82f6" },
  { id: "navy", hex: "#1e40af" },
  { id: "violet", hex: "#8b5cf6" },
  { id: "magenta", hex: "#d946ef" },
  { id: "pink", hex: "#ec4899" },
  { id: "maroon", hex: "#9f1239" },
  { id: "brown", hex: "#b45309" },
  { id: "gray", hex: "#94a3b8" },
  { id: "white", hex: "#f8fafc" },
  { id: "black", hex: "#27272a" },
] as const;

export type TagPaletteId = (typeof TAG_PALETTE)[number]["id"];

/** Tailwind 400 swatches from the old named palette, so a saved tag keeps its color. */
const LEGACY_TAG_COLOR: Record<string, string> = {
  red: "#f87171",
  rose: "#fb7185",
  pink: "#f472b6",
  fuchsia: "#e879f9",
  purple: "#c084fc",
  violet: "#a78bfa",
  indigo: "#818cf8",
  blue: "#60a5fa",
  sky: "#38bdf8",
  cyan: "#22d3ee",
  teal: "#2dd4bf",
  emerald: "#34d399",
  green: "#4ade80",
  lime: "#a3e635",
  yellow: "#facc15",
  amber: "#fbbf24",
  orange: "#fb923c",
};

const MIN_TAG_HUE_GAP = 45;
const NEUTRAL_SATURATION = 0.25;

/** Spread-out hues first, then the darker and neutral swatches. */
const TAG_SUGGESTION_ORDER = [
  "red",
  "yellow",
  "green",
  "blue",
  "violet",
  "orange",
  "teal",
  "pink",
  "lime",
  "magenta",
  "navy",
  "maroon",
  "brown",
  "gray",
  "white",
  "black",
] as const satisfies readonly TagPaletteId[];

const TAG_SUGGESTION_HEX: readonly string[] = TAG_SUGGESTION_ORDER.map((id) => TAG_PALETTE.find((item) => item.id === id)!.hex);

export type TagRef = {
  id: string;
  name: string;
  color: string;
};

export const tagChipClass = "inline-flex items-center rounded-full px-2 py-0.5 text-xs";

export function normalizeTagColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const legacy = LEGACY_TAG_COLOR[trimmed];
  if (legacy) return legacy;
  const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/);
  if (rgb) {
    const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if (channels.some((channel) => channel > 255)) return null;
    return rgbToHex(channels[0], channels[1], channels[2]);
  }
  const hex = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!hex) return null;
  const digits = hex[1].length === 3 ? [...hex[1]].map((channel) => channel + channel).join("") : hex[1];
  return `#${digits}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const hex = normalizeTagColor(color);
  if (!hex) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function hexToHsv(color: string): { h: number; s: number; v: number } | null {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - chroma;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function isLightTagColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255 > 0.82;
}

export function tagChipStyle(color: string): { backgroundColor: string; color: string } {
  const rgb = hexToRgb(color) ?? { r: 239, g: 68, b: 68 };
  const mix = (channel: number) => Math.round(channel * 0.28 + 255 * 0.72);
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    color: `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`,
  };
}

export function tagSwatchStyle(color: string): { backgroundColor: string } {
  const rgb = hexToRgb(color) ?? { r: 239, g: 68, b: 68 };
  return { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` };
}

function canonical(color: string): string {
  return normalizeTagColor(color) ?? color.trim().toLowerCase();
}

function hueDistance(a: string, b: string): number {
  const left = hexToHsv(a);
  const right = hexToHsv(b);
  if (!left || !right) return 180;
  if (left.s < NEUTRAL_SATURATION || right.s < NEUTRAL_SATURATION) {
    return left.s < NEUTRAL_SATURATION && right.s < NEUTRAL_SATURATION ? 0 : 180;
  }
  const delta = Math.abs(left.h - right.h);
  return Math.min(delta, 360 - delta);
}

function sortKey(color: string): number {
  const hsv = hexToHsv(color);
  if (!hsv || hsv.s < NEUTRAL_SATURATION) return 400 + (hsv ? 1 - hsv.v : 1);
  return hsv.h;
}

export function suggestTagColors(used: Iterable<string>, selected: string, limit = 5): string[] {
  const taken = new Set([...used].map(canonical));
  const current = canonical(selected);
  const pool = TAG_SUGGESTION_HEX.filter((color) => color === current || !taken.has(color));
  const available = pool.includes(current) ? pool : [current, ...pool];
  const picks: string[] = [current];
  for (const color of available) {
    if (picks.length >= limit) break;
    if (picks.includes(color)) continue;
    if (picks.some((pick) => hueDistance(pick, color) < MIN_TAG_HUE_GAP)) continue;
    picks.push(color);
  }
  while (picks.length < limit) {
    let best: string | null = null;
    let bestGap = -1;
    for (const color of available) {
      if (picks.includes(color)) continue;
      const gap = Math.min(...picks.map((pick) => hueDistance(pick, color)));
      if (gap > bestGap) {
        bestGap = gap;
        best = color;
      }
    }
    if (!best) break;
    picks.push(best);
  }
  return picks.sort((a, b) => sortKey(a) - sortKey(b));
}

export function firstFreeTagColor(used: Iterable<string>): string {
  const taken = [...used].map(canonical);
  const spaced = TAG_SUGGESTION_HEX.find((color) => taken.every((have) => hueDistance(color, have) >= MIN_TAG_HUE_GAP));
  if (spaced) return spaced;
  return TAG_SUGGESTION_HEX.find((color) => !taken.includes(color)) ?? TAG_PALETTE[0].hex;
}

export type TagMatchMode = "any" | "all";

export function parseTagMatch(value: string): TagMatchMode {
  return value === "all" ? "all" : "any";
}

/** No ids means no tag constraint. "all" requires every id; otherwise any id matches. */
export function tagFilter(tagIds: string[], match: TagMatchMode) {
  if (tagIds.length === 0) return {};
  if (match === "all") {
    return { AND: tagIds.map((tagId) => ({ tags: { some: { tagId } } })) };
  }
  return { tags: { some: { tagId: { in: tagIds } } } };
}

export function assignmentTags(rows: { tag: TagRef }[]): TagRef[] {
  return rows
    .map((row) => row.tag)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export type OverlapRow<T> = {
  item: T;
  overlap: TagRef[];
};

export function rankByOverlap<T>(
  items: T[],
  tagsOf: (item: T) => TagRef[],
  selectedIds: string[],
  nameOf: (item: T) => string,
): OverlapRow<T>[] {
  const selected = new Set(selectedIds);
  return items
    .map((item) => ({ item, overlap: tagsOf(item).filter((tag) => selected.has(tag.id)) }))
    .filter((row) => row.overlap.length > 0)
    .sort((a, b) => {
      const byCount = b.overlap.length - a.overlap.length;
      if (byCount !== 0) return byCount;
      return nameOf(a.item).localeCompare(nameOf(b.item), undefined, { sensitivity: "base" });
    });
}
