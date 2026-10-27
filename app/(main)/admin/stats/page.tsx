import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { firstParam } from "@/lib/http";
import { t, type Lang, type MessageKey } from "@/lib/i18n";
import { localDateString, wallClockToUtc } from "@/lib/dates";
import { dailyCounts, entityCounts, type CreatedKey, type EntityKey } from "@/lib/audit-data";
import { addIsoDays, dailyWindow, displayIsoDay, distribution, eachIsoDay, isoDate } from "@/lib/audit-stats";
import { FilterBar, PageFrame } from "@/components/chrome";
import { DateField, compactFieldClass, compactLabelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

const ENTITIES: { key: EntityKey; label: MessageKey }[] = [
  { key: "companies", label: "companies" },
  { key: "jobs", label: "jobs" },
  { key: "contacts", label: "statsContacts" },
  { key: "notes", label: "notes" },
  { key: "events", label: "events" },
];

const DAY_KEYS: CreatedKey[] = ["signups", "companies", "jobs", "contacts", "notes", "events"];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const search = await searchParams;
  const lang = admin.uiLanguage;
  const timeZone = admin.timezone;
  const from = firstParam(search.from);
  const to = firstParam(search.to);
  const bounds = dateBounds(from, to);
  const today = localDateString(new Date(), timeZone);
  const days = dailyWindow(bounds.start ?? "", bounds.end ?? "", today);
  const summaryFrom = bounds.start ? wallClockToUtc(bounds.start, timeZone) : null;
  const summaryTo = bounds.end ? wallClockToUtc(addIsoDays(bounds.end, 1), timeZone) : null;
  const dayFrom = wallClockToUtc(days.from, timeZone);
  const dayTo = wallClockToUtc(addIsoDays(days.to, 1), timeZone);
  const createdAt = summaryFrom || summaryTo
    ? { ...(summaryFrom ? { gte: summaryFrom } : {}), ...(summaryTo ? { lt: summaryTo } : {}) }
    : undefined;
  const [userCount, signups, perUser, byDay] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: createdAt ? { createdAt } : undefined }),
    entityCounts(summaryFrom, summaryTo),
    dayFrom && dayTo ? dailyCounts(DAY_KEYS, dayFrom, dayTo, timeZone) : Promise.resolve(null),
  ]);
  const dayRows = eachIsoDay(days.from, days.to)
    .reverse()
    .filter((day) => DAY_KEYS.some((key) => (byDay?.[key].get(day) ?? 0) > 0));
  return (
    <PageFrame lang={lang} title={t(lang, "stats")} description={t(lang, "statsIntro")}>
      <FilterBar className="mb-4" legend={t(lang, "filters")}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-36 shrink-0">
            <span className={compactLabelClass}>{t(lang, "fromDate")}</span>
            <DateField compact name="from" defaultValue={from} lang={lang} />
          </label>
          <label className="w-36 shrink-0">
            <span className={compactLabelClass}>{t(lang, "toDate")}</span>
            <DateField compact name="to" defaultValue={to} lang={lang} />
          </label>
          <button className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">{t(lang, "apply")}</button>
        </div>
      </FilterBar>
      <p className="mb-3 text-sm text-slate-300">
        {t(lang, "statsSignups")}: {countText(signups)}
      </p>
      <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-3 py-2" />
              <th className={numHead}>{t(lang, "statsTotal")}</th>
              <th className={numHead}>{t(lang, "statsWithAny")}</th>
              <th className={numHead}>{t(lang, "statsMax")}</th>
              <th className={numHead}>{t(lang, "statsAverage")}</th>
              <th className={numHead}>{t(lang, "statsMedian")}</th>
            </tr>
          </thead>
          <tbody>
            {ENTITIES.map((entity) => {
              const stats = distribution(perUser[entity.key], userCount);
              return (
                <tr key={entity.key} className="border-t border-slate-800">
                  <td className="px-3 py-2">{t(lang, entity.label)}</td>
                  <td className={numCell}>{countText(stats.total)}</td>
                  <td className={numCell}>{countText(stats.withAny)}</td>
                  <td className={numCell}>{countText(stats.max)}</td>
                  <td className={numCell}>{averageText(stats.average)}</td>
                  <td className={numCell}>{countText(stats.median)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mb-2 text-base">{t(lang, "statsPerDay")}</h2>
      {days.truncated ? <p className="mb-2 text-sm text-slate-400">{t(lang, "statsDayCap")}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-3 py-2">{t(lang, "statsDay")}</th>
              {DAY_KEYS.map((key) => (
                <th key={key} className={numHead}>{dayHeader(lang, key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayRows.map((day) => (
              <tr key={day} className="border-t border-slate-800">
                <td className="px-3 py-2 whitespace-nowrap">{displayIsoDay(day)}</td>
                {DAY_KEYS.map((key) => (
                  <td key={key} className={numCell}>{countText(byDay?.[key].get(day) ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}

function dateBounds(from: string, to: string): { start: string | null; end: string | null } {
  let start = isoDate(from);
  let end = isoDate(to);
  if (start && end && start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  return { start, end };
}

function dayHeader(lang: Lang, key: CreatedKey): string {
  if (key === "signups") return t(lang, "statsSignups");
  if (key === "companies") return t(lang, "companies");
  if (key === "jobs") return t(lang, "jobs");
  if (key === "contacts") return t(lang, "statsContacts");
  if (key === "notes") return t(lang, "notes");
  return t(lang, "events");
}

const numHead = "px-3 py-2 text-right";
const numCell = "px-3 py-2 text-right tabular-nums";

function countText(value: number) {
  return value.toLocaleString("en-US");
}

function averageText(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
