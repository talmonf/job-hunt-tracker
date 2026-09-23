import { prisma } from "./prisma";
import { formatDate, formatDateTime, localDateString, localHour } from "./dates";
import { sendMail, smtpConfigured } from "./mail";

export async function runNotifications(now = new Date()) {
  const smtp = smtpConfigured();
  let dueReminders = 0;
  let recordedReminders = 0;
  let digests = 0;
  let emailed = 0;

  const jobs = await prisma.job.findMany({
    where: {
      followUpReminderSentAt: null,
      OR: [{ reminderLeadDays: { not: null } }, { reminderLeadHours: { not: null } }],
    },
    include: { user: true },
  });

  for (const job of jobs) {
    const leadMs = ((job.reminderLeadDays ?? 0) * 24 + (job.reminderLeadHours ?? 0)) * 60 * 60 * 1000;
    if (job.followUpAt.getTime() - leadMs > now.getTime()) continue;
    dueReminders += 1;
    const he = job.user.uiLanguage === "he";
    const when = formatDateTime(job.followUpAt, job.user.timezone);
    const subject = he ? `תזכורת המשך: ${job.companyName}` : `Follow-up reminder: ${job.companyName}`;
    const body = he
      ? `מועד ההמשך עבור ${job.companyName}${job.title ? ` — ${job.title}` : ""} הוא ${when}.`
      : `Follow up on ${job.companyName}${job.title ? ` — ${job.title}` : ""} at ${when}.`;
    const dedupeKey = `reminder:${job.id}:${job.followUpAt.toISOString()}:${job.reminderLeadDays ?? ""}:${job.reminderLeadHours ?? ""}`;
    const sent = smtp ? await sendMail(job.user.email, subject, body).catch(() => false) : false;
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId: job.userId, dedupeKey } },
      create: {
        userId: job.userId,
        kind: "reminder",
        dedupeKey,
        subject,
        body,
        emailed: sent,
        emailedAt: sent ? now : null,
      },
      update: { subject, body, emailed: sent, emailedAt: sent ? now : null },
    });
    recordedReminders += 1;
    if (sent) {
      emailed += 1;
      await prisma.job.update({ where: { id: job.id }, data: { followUpReminderSentAt: now } });
    }
  }

  const users = await prisma.user.findMany({ where: { digestEnabled: true, isActive: true } });
  for (const user of users) {
    const localDate = localDateString(now, user.timezone);
    if (localHour(now, user.timezone) < user.digestHour) continue;
    if (user.lastDigestLocalDate === localDate) continue;
    const until = new Date(now.getTime() + user.digestDaysAhead * 86400000);
    const [followUps, meetings, contacts] = await Promise.all([
      prisma.job.findMany({
        where: { userId: user.id, followUpAt: { gte: now, lte: until } },
        orderBy: { followUpAt: "asc" },
      }),
      prisma.event.findMany({
        where: { userId: user.id, type: "meeting", occurredAt: { gte: now, lte: until } },
        include: { job: true, contact: true },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.contact.findMany({
        where: { userId: user.id, nextActionDate: { gte: now, lte: until } },
        orderBy: { nextActionDate: "asc" },
      }),
    ]);
    const he = user.uiLanguage === "he";
    const lines = [
      he ? "תאריכי המשך" : "Follow-ups",
      ...followUps.map((job) => `- ${formatDateTime(job.followUpAt, user.timezone)} ${job.companyName} ${job.title}`.trim()),
      he ? "פגישות" : "Meetings",
      ...meetings.map((meeting) => {
        const end = meeting.endsAt ? ` – ${formatDateTime(meeting.endsAt, user.timezone)}` : "";
        const who = meeting.job?.companyName || meeting.contact?.fullName || "";
        return `- ${formatDateTime(meeting.occurredAt, user.timezone)}${end} ${who}`.trim();
      }),
      he ? "פעולות נטוורקינג" : "Networking next steps",
      ...contacts.map((contact) => `- ${formatDate(contact.nextActionDate!, user.timezone)} ${contact.fullName}`),
    ];
    const subject = he ? "תאריכים קרובים" : "Upcoming dates";
    const body = lines.join("\n");
    const dedupeKey = `digest:${localDate}`;
    const sent = smtp ? await sendMail(user.email, subject, body).catch(() => false) : false;
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId: user.id, dedupeKey } },
      create: { userId: user.id, kind: "digest", dedupeKey, subject, body, emailed: sent, emailedAt: sent ? now : null },
      update: { subject, body, emailed: sent, emailedAt: sent ? now : null },
    });
    if (sent) {
      emailed += 1;
      digests += 1;
      await prisma.user.update({ where: { id: user.id }, data: { lastDigestLocalDate: localDate } });
    }
  }

  return { dueReminders, recordedReminders, digests, emailed, smtp };
}
