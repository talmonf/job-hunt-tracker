import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { ActivityInput } from "./audit-path";

const DEDUPE_MS = 2000;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function eventKey(event: { kind: string; path: string; control: string; target: string }): string {
  return `${event.kind}\0${event.path}\0${event.control}\0${event.target}`;
}

export async function recordActivity(userId: string, events: ActivityInput[]) {
  if (events.length === 0) return;
  const since = new Date(Date.now() - DEDUPE_MS);
  const recent = await prisma.activityEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { kind: true, path: true, control: true, target: true },
  });
  const seen = new Set(recent.map((row) => eventKey(row)));
  const fresh = events.filter((event) => {
    const key = eventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (fresh.length === 0) return;
  await prisma.activityEvent.createMany({
    data: fresh.map((event) => ({ userId, ...event })),
  });
}

export async function pruneActivity(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  try {
    const result = await prisma.activityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return result.count;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return 0;
    throw error;
  }
}
