import type { TagColor } from "@prisma/client";

export const TAG_COLORS = [
  "red",
  "rose",
  "pink",
  "fuchsia",
  "purple",
  "violet",
  "indigo",
  "blue",
  "sky",
  "cyan",
  "teal",
  "emerald",
  "green",
  "lime",
  "yellow",
  "amber",
  "orange",
] as const satisfies readonly TagColor[];

export type TagRef = {
  id: string;
  name: string;
  color: TagColor;
};

export const TAG_CHIP_CLASS: Record<TagColor, string> = {
  red: "bg-red-500/15 text-red-200",
  rose: "bg-rose-500/15 text-rose-200",
  pink: "bg-pink-500/15 text-pink-200",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-200",
  purple: "bg-purple-500/15 text-purple-200",
  violet: "bg-violet-500/15 text-violet-200",
  indigo: "bg-indigo-500/15 text-indigo-200",
  blue: "bg-blue-500/15 text-blue-200",
  sky: "bg-sky-500/15 text-sky-200",
  cyan: "bg-cyan-500/15 text-cyan-200",
  teal: "bg-teal-500/15 text-teal-200",
  emerald: "bg-emerald-500/15 text-emerald-200",
  green: "bg-green-500/15 text-green-200",
  lime: "bg-lime-500/15 text-lime-200",
  yellow: "bg-yellow-500/15 text-yellow-200",
  amber: "bg-amber-500/15 text-amber-200",
  orange: "bg-orange-500/15 text-orange-200",
};

export const TAG_SWATCH_CLASS: Record<TagColor, string> = {
  red: "bg-red-400",
  rose: "bg-rose-400",
  pink: "bg-pink-400",
  fuchsia: "bg-fuchsia-400",
  purple: "bg-purple-400",
  violet: "bg-violet-400",
  indigo: "bg-indigo-400",
  blue: "bg-blue-400",
  sky: "bg-sky-400",
  cyan: "bg-cyan-400",
  teal: "bg-teal-400",
  emerald: "bg-emerald-400",
  green: "bg-green-400",
  lime: "bg-lime-400",
  yellow: "bg-yellow-400",
  amber: "bg-amber-400",
  orange: "bg-orange-400",
};

/** Hue of each Tailwind 400 swatch. Neighboring names such as red, rose, and pink sit only a few degrees apart. */
const TAG_HUE: Record<TagColor, number> = {
  red: 0,
  rose: 351,
  pink: 329,
  fuchsia: 292,
  purple: 270,
  violet: 255,
  indigo: 234,
  blue: 213,
  sky: 198,
  cyan: 188,
  teal: 172,
  emerald: 158,
  green: 142,
  lime: 83,
  yellow: 48,
  amber: 43,
  orange: 27,
};

const MIN_TAG_HUE_GAP = 45;

/** Primaries first, then backups, so the five quick swatches stay easy to tell apart. */
const TAG_SUGGESTION_ORDER = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
  "cyan",
  "orange",
  "lime",
  "fuchsia",
  "emerald",
  "indigo",
  "amber",
  "sky",
  "teal",
  "violet",
  "pink",
  "rose",
] as const satisfies readonly TagColor[];

function hueGap(a: TagColor, b: TagColor) {
  const delta = Math.abs(TAG_HUE[a] - TAG_HUE[b]);
  return Math.min(delta, 360 - delta);
}

export function suggestTagColors(used: Iterable<TagColor>, selected: TagColor, limit = 5): TagColor[] {
  const taken = new Set(used);
  const available = TAG_SUGGESTION_ORDER.filter((color) => color === selected || !taken.has(color));
  const picks: TagColor[] = [selected];
  for (const color of available) {
    if (picks.length >= limit) break;
    if (picks.includes(color)) continue;
    if (picks.some((pick) => hueGap(pick, color) < MIN_TAG_HUE_GAP)) continue;
    picks.push(color);
  }
  while (picks.length < limit) {
    let best: TagColor | null = null;
    let bestGap = -1;
    for (const color of available) {
      if (picks.includes(color)) continue;
      const gap = Math.min(...picks.map((pick) => hueGap(pick, color)));
      if (gap > bestGap) {
        bestGap = gap;
        best = color;
      }
    }
    if (!best) break;
    picks.push(best);
  }
  return picks.sort((a, b) => TAG_HUE[a] - TAG_HUE[b]);
}

export function firstFreeTagColor(used: Iterable<TagColor>): TagColor {
  const taken = new Set(used);
  return TAG_COLORS.find((color) => !taken.has(color)) ?? TAG_COLORS[0];
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
