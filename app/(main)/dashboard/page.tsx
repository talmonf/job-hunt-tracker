import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam } from "@/lib/http";
import { addLocalDays, formatDateTime, formatScheduledDay, formatScheduledRange, formatWeekRange, localDateString, startOfSundayWeek } from "@/lib/dates";
import { channelLabel, meetingKindLabel, statusLabel, t, type Lang } from "@/lib/i18n";
import { JOB_STATUSES } from "@/lib/events";
import { dash } from "@/lib/mask";
import { PageFrame, statusChipClass } from "@/components/chrome";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const lang = user.uiLanguage;
  const allTime = firstParam((await searchParams).period) === "all";
  const goals = await prisma.userGoals.findUnique({ where: { userId: user.id } });
  const weekStart = startOfSundayWeek(new Date(), user.timezone);
  const weekEnd = addLocalDays(weekStart, 7, user.timezone);
  const weekFrom = localDateString(weekStart, user.timezone);
  const weekTo = localDateString(addLocalDays(weekStart, 6, user.timezone), user.timezone);
  const horizon = new Date(Date.now() + user.digestDaysAhead * 86400000);
  const inWeek = { gte: weekStart, lt: weekEnd };
  const [applications, outreaches, meetings, statuses, followUps, upcomingMeetings, nextSteps] = await Promise.all([
    prisma.event.count({
      where: { userId: user.id, type: "application", ...(allTime ? {} : { occurredAt: inWeek }) },
    }),
    prisma.event.count({
      where: { userId: user.id, type: "outreach", ...(allTime ? {} : { occurredAt: inWeek }) },
    }),
    prisma.event.count({
      where: allTime
        ? { userId: user.id, type: "meeting" }
        : {
            userId: user.id,
            type: "meeting",
            OR: [
              { startsAt: inWeek },
              { AND: [{ startsAt: null }, { occurredAt: inWeek }] },
            ],
          },
    }),
    prisma.job.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.job.findMany({ where: { userId: user.id, followUpAt: { gte: new Date(), lte: horizon } }, orderBy: { followUpAt: "asc" }, take: 8 }),
    prisma.event.findMany({
      where: {
        userId: user.id,
        type: "meeting",
        OR: [
          { startsAt: { gte: new Date(), lte: horizon } },
          { AND: [{ startsAt: null }, { occurredAt: { gte: new Date(), lte: horizon } }] },
        ],
      },
      include: { job: true, contact: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.contact.findMany({
      where: { userId: user.id, nextActionDate: { gte: new Date(), lte: horizon } },
      orderBy: { nextActionDate: "asc" },
      take: 8,
    }),
  ]);
  const applicationGoal = Math.round((goals?.applicationsPerDay ?? 0) * 7);
  const networkingGoal = Math.round(goals?.networkingPerWeek ?? (goals?.networkingPerDay ?? 0) * 7);
  const counts = new Map(statuses.map((row) => [row.status, row._count._all]));
  return (
    <PageFrame lang={lang} title={t(lang, "dashboard")} description={t(lang, "dashboardIntro")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">
          {t(lang, allTime ? "allTime" : "thisWeek")}
          {allTime ? null : (
            <span className="ms-2 text-sm font-normal text-slate-400">{formatWeekRange(weekStart, user.timezone, lang)}</span>
          )}
        </h2>
        <div className="flex rounded-md border border-slate-700 text-sm">
          <Link className={periodLinkClass(!allTime)} href="/dashboard">
            {t(lang, "thisWeek")}
          </Link>
          <Link className={periodLinkClass(allTime)} href="/dashboard?period=all">
            {t(lang, "allTime")}
          </Link>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          href={eventsHref("application", allTime, weekFrom, weekTo)}
          label={t(lang, "applicationsWeek")}
          actual={applications}
          goal={allTime ? null : applicationGoal}
          tone="sky"
        />
        <StatCard
          href={eventsHref("outreach", allTime, weekFrom, weekTo)}
          label={t(lang, "networkingWeek")}
          actual={outreaches}
          goal={allTime ? null : networkingGoal}
          tone="violet"
        />
        <StatCard
          href={eventsHref("meeting", allTime, weekFrom, weekTo)}
          label={t(lang, "meetingsWeek")}
          actual={meetings}
          goal={null}
          tone="amber"
        />
      </div>
      <h2 className="mb-3 mt-8 text-lg">{t(lang, "pipeline")}</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10">
        {JOB_STATUSES.map((status) => (
          <li key={status}>
            <Link
              href={`/jobs?status=${status}`}
              className={`flex h-full min-h-16 flex-col items-center justify-center rounded-md px-1.5 py-2 text-center hover:brightness-110 ${statusChipClass(status)}`}
            >
              <span className="text-xs font-medium leading-tight">{statusLabel(lang, status)}</span>
              <span className="mt-1 text-2xl font-semibold leading-none">{counts.get(status) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 mt-8 text-lg">{t(lang, "upcoming")}</h2>
      {followUps.length + upcomingMeetings.length + nextSteps.length === 0 ? (
        <p className="text-sm text-slate-400">{t(lang, "noUpcoming")}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {followUps.map((job) => (
            <li key={job.id}>
              <Link className="text-sky-300" href={`/jobs/${job.id}`}>
                {job.followUpAt ? formatDateTime(job.followUpAt, user.timezone) : "—"} · {dash(job.companyName, hide)} {job.title ? `· ${dash(job.title, hide)}` : ""}
              </Link>
            </li>
          ))}
          {upcomingMeetings.map((meeting) => {
            const href = meeting.jobId ? `/jobs/${meeting.jobId}` : meeting.contactId ? `/contacts/${meeting.contactId}` : "";
            const when = formatScheduledRange(meeting.startsAt ?? meeting.occurredAt, meeting.endsAt, user.timezone, lang);
            const details = upcomingMeetingDetails(meeting, lang, hide);
            const line = `${when} · ${details}`;
            return (
              <li key={meeting.id}>
                {href ? (
                  <Link className="text-sky-300" href={href}>
                    {line}
                  </Link>
                ) : (
                  line
                )}
              </li>
            );
          })}
          {nextSteps.map((contact) => (
            <li key={contact.id}>
              <Link className="text-sky-300" href={`/contacts/${contact.id}`}>
                {formatScheduledDay(contact.nextActionDate!, user.timezone, lang)} · {upcomingContactDetails(contact, hide)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

function upcomingMeetingDetails(
  meeting: {
    stage: string | null;
    channel: string | null;
    counterpartyName: string;
    job: { companyName: string; title: string } | null;
    contact: { fullName: string } | null;
  },
  lang: Lang,
  hide: boolean,
) {
  return [
    dash(meeting.job?.companyName || meeting.contact?.fullName || "", hide),
    meeting.job?.title ? dash(meeting.job.title, hide) : "",
    meetingKindLabel(lang, meeting.stage),
    meeting.channel ? channelLabel(lang, meeting.channel) : "",
    meeting.counterpartyName ? dash(meeting.counterpartyName, hide) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function upcomingContactDetails(
  contact: { fullName: string; workplace: string; role: string; nextAction: string },
  hide: boolean,
) {
  return [
    dash(contact.fullName, hide),
    contact.workplace.trim() ? dash(contact.workplace, hide) : "",
    contact.role.trim() ? dash(contact.role, hide) : "",
    contact.nextAction.trim() ? dash(contact.nextAction, hide) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function periodLinkClass(active: boolean) {
  return `px-2.5 py-1 first:rounded-s-md last:rounded-e-md ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white"}`;
}

function eventsHref(type: string, allTime: boolean, from: string, to: string) {
  if (allTime) return `/events?type=${type}`;
  return `/events?type=${type}&occurredFrom=${from}&occurredTo=${to}`;
}

const CARD_TONES = {
  sky: { card: "bg-sky-400 text-sky-950 hover:bg-sky-300", track: "fill-sky-950/25", bar: "fill-sky-950" },
  violet: { card: "bg-violet-400 text-violet-950 hover:bg-violet-300", track: "fill-violet-950/25", bar: "fill-violet-950" },
  amber: { card: "bg-amber-300 text-amber-950 hover:bg-amber-200", track: "fill-amber-950/25", bar: "fill-amber-950" },
} as const;

function StatCard({
  href,
  label,
  actual,
  goal,
  tone,
}: {
  href: string;
  label: string;
  actual: number;
  goal: number | null;
  tone: keyof typeof CARD_TONES;
}) {
  const colors = CARD_TONES[tone];
  const width = goal === null ? 0 : Math.min(100, goal === 0 ? (actual > 0 ? 100 : 0) : (actual / goal) * 100);
  return (
    <Link href={href} className={`block h-full rounded-md px-3 py-1.5 ${colors.card}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        <span>{goal === null ? actual : `${actual} / ${goal}`}</span>
      </div>
      {goal === null ? null : (
        <svg viewBox="0 0 100 6" className="mt-1.5 h-1.5 w-full" role="img">
          <rect width="100" height="6" className={colors.track} rx="2" />
          <rect width={width} height="6" className={colors.bar} rx="2" />
        </svg>
      )}
    </Link>
  );
}
