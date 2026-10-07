import { prisma } from "./prisma";
import type { JobStatus } from "@prisma/client";
import { followUpSuperseded } from "./follow-up";

export async function recomputeJobStatus(jobId: string) {
  const latest = await prisma.event.findFirst({
    where: { jobId, resultingStatus: { not: null } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
  const status = (latest?.resultingStatus as JobStatus | undefined) ?? "interest";
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status },
    select: { followUpAt: true },
  });
  if (!job.followUpAt) return;
  const events = await prisma.event.findMany({
    where: { jobId, type: { in: ["outreach", "application", "meeting", "status_change"] } },
    select: { type: true, occurredAt: true, startsAt: true },
  });
  if (!followUpSuperseded({ followUpAt: job.followUpAt, status, events })) return;
  await prisma.job.update({
    where: { id: jobId },
    data: { followUpAt: null, followUpReminderSentAt: null },
  });
}
