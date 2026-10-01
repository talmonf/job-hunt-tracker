import type { TagColor } from "@prisma/client";

export const TAG_COLORS = ["sky", "emerald", "amber", "rose", "violet", "cyan", "orange", "fuchsia"] as const satisfies readonly TagColor[];

export type TagRef = {
  id: string;
  name: string;
  color: TagColor;
};

export const TAG_CHIP_CLASS: Record<TagColor, string> = {
  sky: "bg-sky-500/15 text-sky-200",
  emerald: "bg-emerald-500/15 text-emerald-200",
  amber: "bg-amber-500/15 text-amber-200",
  rose: "bg-rose-500/15 text-rose-200",
  violet: "bg-violet-500/15 text-violet-200",
  cyan: "bg-cyan-500/15 text-cyan-200",
  orange: "bg-orange-500/15 text-orange-200",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-200",
};

export const TAG_SWATCH_CLASS: Record<TagColor, string> = {
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  orange: "bg-orange-400",
  fuchsia: "bg-fuchsia-400",
};

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
