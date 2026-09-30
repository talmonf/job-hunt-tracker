import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { addLocalDays, formatDate, formatDateTime, formatScheduledRange, formatWeekRange, startOfSundayWeek } from "@/lib/dates";
import { channelLabel, meetingKindLabel, statusLabel, t, type Lang } from "@/lib/i18n";
import { JOB_STATUSES } from "@/lib/events";
import { dash } from "@/lib/mask";
import { PageFrame, statusClass } from "@/components/chrome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const lang = user.uiLanguage;
  const goals = await prisma.userGoals.findUnique({ where: { userId: user.id } });
  const weekStart = startOfSundayWeek(new Date(), user.timezone);
  const weekEnd = addLocalDays(weekStart, 7, user.timezone);
  const horizon = new Date(Date.now() + user.digestDaysAhead * 86400000);
  const [applications, outreaches, meetings, statuses, followUps, upcomingMeetings, nextSteps] = await Promise.all([
    prisma.event.count({ where: { userId: user.id, type: "application", occurredAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.event.count({ where: { userId: user.id, type: "outreach", occurredAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.event.count({
      where: {
        userId: user.id,
        type: "meeting",
        OR: [
          { startsAt: { gte: weekStart, lt: weekEnd } },
          { AND: [{ startsAt: null }, { occurredAt: { gte: weekStart, lt: weekEnd } }] },
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
      <h2 className="mb-3 text-lg">
        {t(lang, "thisWeek")}
        <span className="ms-2 text-sm font-normal text-slate-400">{formatWeekRange(weekStart, user.timezone, lang)}</span>
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Bar label={t(lang, "applicationsWeek")} actual={applications} goal={applicationGoal} />
        <Bar label={t(lang, "networkingWeek")} actual={outreaches} goal={networkingGoal} />
        <div className="rounded-md border border-slate-700 p-3 text-sm">
          <div className="text-slate-300">{t(lang, "meetingsWeek")}</div>
          <div className="mt-2 text-2xl">{meetings}</div>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg">{t(lang, "pipeline")}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {JOB_STATUSES.map((status) => (
          <li key={status} className="rounded-md border border-slate-700 px-3 py-2 text-sm">
            <span className={statusClass(status)}>{statusLabel(lang, status)}</span>
            <span className="float-end">{counts.get(status) ?? 0}</span>
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
                {formatDate(contact.nextActionDate!, user.timezone)} · {dash(contact.fullName, hide)}
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

function Bar({ label, actual, goal }: { label: string; actual: number; goal: number }) {
  const width = Math.min(100, goal === 0 ? (actual > 0 ? 100 : 0) : (actual / goal) * 100);
  return (
    <div className="rounded-md border border-slate-700 p-3">
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {actual} / {goal}
        </span>
      </div>
      <svg viewBox="0 0 100 8" className="h-2 w-full" role="img">
        <rect width="100" height="8" className="fill-slate-800" rx="2" />
        <rect width={width} height="8" className="fill-sky-500" rx="2" />
      </svg>
    </div>
  );
}
