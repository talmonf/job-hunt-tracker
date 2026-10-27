import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { auditUserCode } from "@/lib/crypto";
import { firstParam, preserveQuery } from "@/lib/http";
import { t, type Lang } from "@/lib/i18n";
import { formatDateTime, wallClockToUtc } from "@/lib/dates";
import { addIsoDays, isoDate } from "@/lib/audit-stats";
import { EmptyState, FilterBar, PageFrame } from "@/components/chrome";
import { DateField, compactFieldClass, compactLabelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const TOP_LIMIT = 8;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const search = await searchParams;
  const lang = admin.uiLanguage;
  const kind = firstParam(search.kind);
  const pathQuery = firstParam(search.path).trim().slice(0, 80);
  const codeQuery = firstParam(search.code).trim().toLowerCase();
  const code = /^[0-9a-f]{8}$/.test(codeQuery) ? codeQuery : "";
  const from = firstParam(search.from);
  const to = firstParam(search.to);
  const requestedPage = Number(firstParam(search.page));
  const matchedUserIds = code || (codeQuery && !code) ? await userIdsForCode(code) : null;
  const baseWhere = activityWhere({ pathQuery, userIds: matchedUserIds, from, to, timeZone: admin.timezone });
  const selectedKind = kind === "page" || kind === "click" ? kind : "";
  const where: Prisma.ActivityEventWhereInput = {
    ...baseWhere,
    ...(selectedKind ? { kind: selectedKind } : {}),
  };
  const [total, pageGroups, clickGroups] = await Promise.all([
    prisma.activityEvent.count({ where }),
    selectedKind === "click"
      ? Promise.resolve([])
      : prisma.activityEvent.groupBy({
          by: ["path"],
          where: { ...baseWhere, kind: "page" },
          _count: { _all: true },
        }),
    selectedKind === "page"
      ? Promise.resolve([])
      : prisma.activityEvent.groupBy({
          by: ["control", "target"],
          where: { ...baseWhere, kind: "click" },
          _count: { _all: true },
        }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(Math.floor(requestedPage), pageCount) : 1;
  const rows = await prisma.activityEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, userId: true, kind: true, path: true, control: true, target: true, createdAt: true },
  });
  const topPages = [...pageGroups].sort((left, right) => right._count._all - left._count._all).slice(0, TOP_LIMIT);
  const topClicks = [...clickGroups].sort((left, right) => right._count._all - left._count._all).slice(0, TOP_LIMIT);
  return (
    <PageFrame lang={lang} title={t(lang, "activity")} description={t(lang, "activityIntro")}>
      <FilterBar className="mb-4" legend={t(lang, "filters")}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-36 shrink-0">
            <span className={compactLabelClass}>{t(lang, "activityKind")}</span>
            <select className={compactFieldClass} name="kind" defaultValue={kind === "page" || kind === "click" ? kind : ""}>
              <option value="">{t(lang, "all")}</option>
              <option value="page">{t(lang, "activityPage")}</option>
              <option value="click">{t(lang, "activityClick")}</option>
            </select>
          </label>
          <label className="w-44 shrink-0">
            <span className={compactLabelClass}>{t(lang, "activityPath")}</span>
            <input className={compactFieldClass} name="path" defaultValue={pathQuery} />
          </label>
          <label className="w-28 shrink-0">
            <span className={compactLabelClass}>{t(lang, "activityCode")}</span>
            <input className={compactFieldClass} name="code" defaultValue={codeQuery} spellCheck={false} />
          </label>
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
      <dl className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t(lang, "activityEvents")} value={countText(total)} />
      </dl>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CountTable lang={lang} title={t(lang, "activityTopPaths")} nameHeader={t(lang, "activityPath")} rows={topPages.map((row) => ({ key: row.path, label: row.path, count: row._count._all }))} />
        <CountTable
          lang={lang}
          title={t(lang, "activityTopClicks")}
          nameHeader={t(lang, "activityTarget")}
          rows={topClicks.map((row) => ({
            key: `${row.control}:${row.target}`,
            label: `${controlLabel(lang, row.control)} · ${targetLabel(lang, row.target)}`,
            count: row._count._all,
          }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>{t(lang, "activityEmpty")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{t(lang, "activityWhen")}</th>
                <th className="px-3 py-2">{t(lang, "activityCode")}</th>
                <th className="px-3 py-2">{t(lang, "activityKind")}</th>
                <th className="px-3 py-2">{t(lang, "activityPath")}</th>
                <th className="px-3 py-2">{t(lang, "activityControl")}</th>
                <th className="px-3 py-2">{t(lang, "activityTarget")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.createdAt, admin.timezone)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{auditUserCode(row.userId)}</td>
                  <td className="px-3 py-2">{row.kind === "page" ? t(lang, "activityPage") : t(lang, "activityClick")}</td>
                  <td className="px-3 py-2">{row.path}</td>
                  <td className="px-3 py-2">{row.control ? controlLabel(lang, row.control) : "—"}</td>
                  <td className="px-3 py-2">{row.target ? targetLabel(lang, row.target) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > PAGE_SIZE ? (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <a className="text-sky-300" href={pageHref(search, page - 1)}>{t(lang, "previousPage")}</a>
          ) : (
            <span className="text-slate-500">{t(lang, "previousPage")}</span>
          )}
          <span className="text-slate-300">{page} / {pageCount}</span>
          {page < pageCount ? (
            <a className="text-sky-300" href={pageHref(search, page + 1)}>{t(lang, "nextPage")}</a>
          ) : (
            <span className="text-slate-500">{t(lang, "nextPage")}</span>
          )}
        </div>
      ) : null}
    </PageFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-700 px-3 py-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-lg text-slate-100">{value}</dd>
    </div>
  );
}

function CountTable({
  lang,
  title,
  nameHeader,
  rows,
}: {
  lang: Lang;
  title: string;
  nameHeader: string;
  rows: { key: string; label: string; count: number }[];
}) {
  return (
    <div>
      <h2 className="mb-2 text-base">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">—</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{nameHeader}</th>
                <th className="px-3 py-2">{t(lang, "activityEvents")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-800">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{countText(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function userIdsForCode(code: string): Promise<string[]> {
  if (!code) return [];
  const accounts = await prisma.user.findMany({ select: { id: true } });
  return accounts.filter((account) => auditUserCode(account.id) === code).map((account) => account.id);
}

function activityWhere(input: {
  pathQuery: string;
  userIds: string[] | null;
  from: string;
  to: string;
  timeZone: string;
}): Prisma.ActivityEventWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  const start = isoDate(input.from);
  const end = isoDate(input.to);
  const fromInstant = start ? wallClockToUtc(start, input.timeZone) : null;
  const nextDay = end ? addIsoDays(end, 1) : null;
  const toInstant = nextDay ? wallClockToUtc(nextDay, input.timeZone) : null;
  if (fromInstant) createdAt.gte = fromInstant;
  if (toInstant) createdAt.lt = toInstant;
  return {
    ...(input.userIds ? { userId: { in: input.userIds } } : {}),
    ...(input.pathQuery
      ? {
          OR: [
            { path: { contains: input.pathQuery, mode: "insensitive" } },
            { target: { contains: input.pathQuery, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(fromInstant || toInstant ? { createdAt } : {}),
  };
}

function controlLabel(lang: Lang, control: string): string {
  if (control === "link") return t(lang, "controlLink");
  if (control === "submit") return t(lang, "controlSubmit");
  if (control === "summary") return t(lang, "controlSummary");
  if (control === "button") return t(lang, "controlButton");
  return control;
}

function targetLabel(lang: Lang, target: string): string {
  if (target === "external") return t(lang, "activityExternal");
  return target;
}

function countText(value: number) {
  return value.toLocaleString("en-US");
}

function pageHref(search: Record<string, string | string[] | undefined>, page: number) {
  return `/admin/activity${preserveQuery(search, page > 1 ? { page: String(page) } : {}, ["page"])}`;
}
