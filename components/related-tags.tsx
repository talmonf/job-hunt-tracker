import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import type { TagRef } from "@/lib/tags";
import { SettingsSection } from "./settings-section";
import { TagChips } from "./tag-chip";

export function RelatedByTags({
  lang,
  hide,
  hasTags,
  jobs,
  employments,
  notes,
  contacts,
  profile = null,
  emptyText,
  className = "mt-8",
  showCount = false,
}: {
  lang: Lang;
  hide: boolean;
  hasTags: boolean;
  jobs: { id: string; label: string; overlap: TagRef[] }[];
  employments: { id: string; label: string; overlap: TagRef[] }[];
  notes: { id: string; label: string; overlap: TagRef[] }[];
  contacts: { id: string; label: string; overlap: TagRef[] }[];
  profile?: { label: string; overlap: TagRef[] } | null;
  emptyText?: string;
  className?: string;
  showCount?: boolean;
}) {
  const profileRows = profile && profile.overlap.length ? [{ id: "profile", label: profile.label, overlap: profile.overlap }] : [];
  const groups = [
    { title: t(lang, "profile"), rows: profileRows, href: () => "/profile" },
    { title: t(lang, "jobs"), rows: jobs, href: (id: string) => `/jobs/${id}` },
    { title: t(lang, "notes"), rows: notes, href: (id: string) => `/notes/${id}` },
    { title: t(lang, "networking"), rows: contacts, href: (id: string) => `/contacts/${id}` },
    { title: t(lang, "employment"), rows: employments, href: (id: string) => `/profile?modal=employment&id=${id}` },
  ];
  const visible = groups.filter((group) => group.rows.length > 0);
  const total = jobs.length + employments.length + notes.length + contacts.length + profileRows.length;
  const noneText = emptyText ?? t(lang, "relatedTagsEmpty");
  const summary = showCount
    ? undefined
    : !hasTags
    ? noneText
    : visible.length
        ? visible.map((group) => `${group.title} ${group.rows.length}`).join(" · ")
        : t(lang, "relatedNone");
  return (
    <SettingsSection
      className={className}
      title={t(lang, "relatedByTags")}
      summary={summary}
      badge={showCount ? String(total) : undefined}
    >
      {!hasTags ? <p className="text-sm text-slate-400">{noneText}</p> : null}
      {hasTags && visible.length === 0 ? <p className="text-sm text-slate-400">{t(lang, "relatedNone")}</p> : null}
      <div className="grid gap-4">
        {visible.map((group) => (
          <div key={group.title}>
            <h3 className="mb-1 text-sm text-slate-300">{group.title}</h3>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link className="text-sky-300" href={group.href(row.id)}>
                    {dash(row.label, hide)}
                  </Link>
                  <TagChips tags={row.overlap} hide={hide} limit={null} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
