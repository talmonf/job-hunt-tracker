import type { TagColor } from "@prisma/client";
import { maskText } from "@/lib/mask";
import { TAG_CHIP_CLASS, type TagRef } from "@/lib/tags";

export function TagChip({ name, color, hide }: { name: string; color: TagColor; hide: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${TAG_CHIP_CLASS[color]}`}>
      {maskText(name, hide)}
    </span>
  );
}

export function TagChips({ tags, hide, limit = 3 }: { tags: TagRef[]; hide: boolean; limit?: number | null }) {
  const shown = limit == null ? tags : tags.slice(0, limit);
  const extra = tags.length - shown.length;
  if (!shown.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} hide={hide} />
      ))}
      {extra > 0 ? <span className="text-xs text-slate-400">+{extra}</span> : null}
    </span>
  );
}
