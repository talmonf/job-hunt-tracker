import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireAdmin } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { t, type Lang } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { formatDateTime, wallClockToUtc } from "@/lib/dates";
import { AI_PROVIDERS, isAiProvider } from "@/lib/ai/providers";
import { formatIls, formatUsd } from "@/lib/ai/money";
import { featureLabel, paySourceLabel, toolLabel } from "@/lib/ai/labels";
import { EmptyState, FilterBar, PageFrame } from "@/components/chrome";
import { DateField, compactFieldClass, compactLabelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const FEATURES = ["import", "compare", "job-details", "test"] as const;

type Bucket = { key: string; calls: number; inputTokens: number; outputTokens: number; costUsdMicros: number };

export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = admin.uiLanguage;
  const q = firstParam(search.q).trim();
  const feature = firstParam(search.feature);
  const provider = firstParam(search.provider);
  const paySource = firstParam(search.paySource);
  const from = firstParam(search.from);
  const to = firstParam(search.to);
  const requestedPage = Number(firstParam(search.page));
  const where = usageWhere({ q, feature, provider, paySource, from, to, timeZone: admin.timezone });
  const [total, totals, byFeature, byProvider, byPay] = await Promise.all([
    prisma.aiUsage.count({ where }),
    prisma.aiUsage.aggregate({
      where,
      _sum: { inputTokens: true, outputTokens: true, costUsdMicros: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["feature"],
      where,
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, costUsdMicros: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["provider"],
      where,
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, costUsdMicros: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["paySource"],
      where,
      _sum: { costUsdMicros: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(Math.floor(requestedPage), pageCount) : 1;
  const rows = await prisma.aiUsage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { user: { select: { fullName: true, email: true } } },
  });
  const featureRows = mergeBuckets(
    FEATURES,
    byFeature.map((row) => ({
      key: row.feature,
      calls: row._count._all,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      costUsdMicros: row._sum.costUsdMicros ?? 0,
    })),
  );
  const toolRows = mergeBuckets(
    AI_PROVIDERS,
    byProvider.map((row) => ({
      key: row.provider,
      calls: row._count._all,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      costUsdMicros: row._sum.costUsdMicros ?? 0,
    })),
  );
  const paidBy = new Map(byPay.map((row) => [row.paySource, row._sum.costUsdMicros ?? 0]));
  return (
    <PageFrame lang={lang} title={t(lang, "aiUsage")} description={t(lang, "aiUsageIntro")}>
      <FilterBar className="mb-4" legend={t(lang, "filters")}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-44 shrink-0">
            <span className={compactLabelClass}>{t(lang, "search")}</span>
            <input className={compactFieldClass} name="q" defaultValue={q} placeholder={t(lang, "search")} />
          </label>
          <label className="w-40 shrink-0">
            <span className={compactLabelClass}>{t(lang, "feature")}</span>
            <select className={compactFieldClass} name="feature" defaultValue={(FEATURES as readonly string[]).includes(feature) ? feature : ""}>
              <option value="">{t(lang, "all")}</option>
              {FEATURES.map((item) => (
                <option key={item} value={item}>{featureLabel(lang, item)}</option>
              ))}
            </select>
          </label>
          <label className="w-36 shrink-0">
            <span className={compactLabelClass}>{t(lang, "aiTool")}</span>
            <select className={compactFieldClass} name="provider" defaultValue={isAiProvider(provider) ? provider : ""}>
              <option value="">{t(lang, "all")}</option>
              {AI_PROVIDERS.map((item) => (
                <option key={item} value={item}>{toolLabel(lang, item)}</option>
              ))}
            </select>
          </label>
          <label className="w-36 shrink-0">
            <span className={compactLabelClass}>{t(lang, "paySource")}</span>
            <select className={compactFieldClass} name="paySource" defaultValue={paySource === "key" || paySource === "credits" || paySource === "sponsored" ? paySource : ""}>
              <option value="">{t(lang, "all")}</option>
              <option value="credits">{t(lang, "payWithCredits")}</option>
              <option value="key">{t(lang, "payWithKey")}</option>
              <option value="sponsored">{t(lang, "payWithSponsored")}</option>
            </select>
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
      <dl className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(lang, "calls")} value={countText(total)} />
        <Stat label={t(lang, "inputTokens")} value={countText(totals._sum.inputTokens ?? 0)} />
        <Stat label={t(lang, "outputTokens")} value={countText(totals._sum.outputTokens ?? 0)} />
        <Stat label={t(lang, "costUsd")} value={formatUsd(totals._sum.costUsdMicros ?? 0)} />
      </dl>
      <p className="mb-4 text-sm text-slate-300">
        {t(lang, "platformSpend")}: {formatUsd(paidBy.get("credits") ?? 0)}
        <span className="mx-2 text-slate-600">·</span>
        {t(lang, "ownKeySpend")}: {formatUsd(paidBy.get("key") ?? 0)}
        <span className="mx-2 text-slate-600">·</span>
        {t(lang, "sponsoredSpend")}: {formatUsd(paidBy.get("sponsored") ?? 0)}
      </p>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Breakdown lang={lang} title={t(lang, "byFeature")} nameHeader={t(lang, "feature")} rows={featureRows} label={(key) => featureLabel(lang, key)} />
        <Breakdown lang={lang} title={t(lang, "byTool")} nameHeader={t(lang, "aiTool")} rows={toolRows} label={(key) => toolLabel(lang, key)} />
      </div>
      {rows.length === 0 ? (
        <EmptyState>{t(lang, "aiUsageEmpty")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{t(lang, "when")}</th>
                <th className="px-3 py-2">{t(lang, "fullName")}</th>
                <th className="px-3 py-2">{t(lang, "feature")}</th>
                <th className="px-3 py-2">{t(lang, "aiTool")}</th>
                <th className="px-3 py-2">{t(lang, "inputTokens")}</th>
                <th className="px-3 py-2">{t(lang, "outputTokens")}</th>
                <th className="px-3 py-2">{t(lang, "costUsd")}</th>
                <th className="px-3 py-2">{t(lang, "paySource")}</th>
                <th className="px-3 py-2">{t(lang, "chargedIls")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.createdAt, admin.timezone)}</td>
                  <td className="px-3 py-2">
                    <div>{dash(row.user.fullName, hide)}</div>
                    <div className="text-xs text-slate-400">{dash(row.user.email, hide)}</div>
                  </td>
                  <td className="px-3 py-2">{featureLabel(lang, row.feature)}</td>
                  <td className="px-3 py-2">{toolLabel(lang, row.provider)} · {row.model}</td>
                  <td className="px-3 py-2">{countText(row.inputTokens)}</td>
                  <td className="px-3 py-2">{countText(row.outputTokens)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatUsd(row.costUsdMicros)}</td>
                  <td className="px-3 py-2">{paySourceLabel(lang, row.paySource)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatIls(row.debitAgorot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 ? (
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

function Breakdown({
  lang,
  title,
  nameHeader,
  rows,
  label,
}: {
  lang: Lang;
  title: string;
  nameHeader: string;
  rows: Bucket[];
  label: (key: string) => string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-base">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-3 py-2">{nameHeader}</th>
              <th className="px-3 py-2">{t(lang, "calls")}</th>
              <th className="px-3 py-2">{t(lang, "inputTokens")}</th>
              <th className="px-3 py-2">{t(lang, "outputTokens")}</th>
              <th className="px-3 py-2">{t(lang, "costUsd")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-800">
                <td className="px-3 py-2">{label(row.key)}</td>
                <td className="px-3 py-2">{countText(row.calls)}</td>
                <td className="px-3 py-2">{countText(row.inputTokens)}</td>
                <td className="px-3 py-2">{countText(row.outputTokens)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatUsd(row.costUsdMicros)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function usageWhere(input: {
  q: string;
  feature: string;
  provider: string;
  paySource: string;
  from: string;
  to: string;
  timeZone: string;
}): Prisma.AiUsageWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  const fromInstant = input.from ? wallClockToUtc(input.from, input.timeZone) : null;
  const nextDay = input.to ? dayAfter(input.to) : null;
  const toInstant = nextDay ? wallClockToUtc(nextDay, input.timeZone) : null;
  if (fromInstant) createdAt.gte = fromInstant;
  if (toInstant) createdAt.lt = toInstant;
  const feature = (FEATURES as readonly string[]).includes(input.feature) ? input.feature : "";
  const provider = isAiProvider(input.provider) ? input.provider : undefined;
  const paySource = input.paySource === "key" || input.paySource === "credits" || input.paySource === "sponsored" ? input.paySource : undefined;
  return {
    ...(input.q
      ? {
          user: {
            OR: [
              { email: { contains: input.q, mode: "insensitive" } },
              { fullName: { contains: input.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(feature ? { feature } : {}),
    ...(provider ? { provider } : {}),
    ...(paySource ? { paySource } : {}),
    ...(fromInstant || toInstant ? { createdAt } : {}),
  };
}

function dayAfter(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${month}-${day}`;
}

function mergeBuckets(known: readonly string[], groups: Bucket[]): Bucket[] {
  const byKey = new Map(groups.map((row) => [row.key, row]));
  const listed = known.map((key) => byKey.get(key) ?? { key, calls: 0, inputTokens: 0, outputTokens: 0, costUsdMicros: 0 });
  const extra = groups.filter((row) => !known.includes(row.key));
  return [...listed, ...extra];
}

function countText(value: number) {
  return value.toLocaleString("en-US");
}

function pageHref(search: Record<string, string | string[] | undefined>, page: number) {
  return `/admin/ai-usage${preserveQuery(search, page > 1 ? { page: String(page) } : {}, ["page"])}`;
}
