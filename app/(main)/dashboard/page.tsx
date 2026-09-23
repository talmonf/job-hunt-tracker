import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { formatDate, formatDateTime, startOfIsoWeek } from "@/lib/dates";
import { statusLabel, t } from "@/lib/i18n";
import { JOB_STATUSES } from "@/lib/events";
import { dash } from "@/lib/mask";
import { PageFrame, statusClass } from "@/components/chrome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const lang = user.uiLanguage;
  const goals = await prisma.userGoals.findUnique({ where: { userId: user.id } });
  const weekStart = startOfIsoWeek(new Date(), user.timezone);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const horizon = new Date(Date.now() + user.digestDaysAhead * 86400000);
  const [applications, outreaches, meetings, statuses, followUps, upcomingMeetings, nextSteps] = await Promise.all([
    prisma.event.count({ where: { userId: user.id, type: "application", occurredAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.event.count({ where: { userId: user.id, type: "outreach", occurredAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.event.count({ where: { userId: user.id, type: "meeting", occurredAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.job.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.job.findMany({ where: { userId: user.id, followUpAt: { gte: new Date(), lte: horizon } }, orderBy: { followUpAt: "asc" }, take: 8 }),
    prisma.event.findMany({
      where: { userId: user.id, type: "meeting", occurredAt: { gte: new Date(), lte: horizon } },
      include: { job: true, contact: true },
      orderBy: { occurredAt: "asc" },
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
      <h2 className="mb-3 text-lg">{t(lang, "thisWeek")}</h2>
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
                {formatDateTime(job.followUpAt, user.timezone)} · {dash(job.companyName, hide)} {job.title ? `· ${dash(job.title, hide)}` : ""}
              </Link>
            </li>
          ))}
          {upcomingMeetings.map((meeting) => (
            <li key={meeting.id}>
              {formatDateTime(meeting.occurredAt, user.timezone)}
              {meeting.endsAt ? ` – ${formatDateTime(meeting.endsAt, user.timezone)}` : ""} · {dash(meeting.job?.companyName || meeting.contact?.fullName || "", hide)}
            </li>
          ))}
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
