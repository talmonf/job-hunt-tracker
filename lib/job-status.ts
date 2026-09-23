import { prisma } from "./prisma";
import type { JobStatus } from "@prisma/client";

export async function recomputeJobStatus(jobId: string) {
  const latest = await prisma.event.findFirst({
    where: { jobId, resultingStatus: { not: null } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
  await prisma.job.update({
    where: { id: jobId },
    data: { status: (latest?.resultingStatus as JobStatus | undefined) ?? "interest" },
  });
}
