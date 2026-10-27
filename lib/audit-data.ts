import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const TABLES = {
  signups: "User",
  companies: "Company",
  jobs: "Job",
  contacts: "Contact",
  notes: "Note",
  events: "Event",
} as const;

export type CreatedKey = keyof typeof TABLES;
export type EntityKey = Exclude<CreatedKey, "signups">;

const ENTITY_KEYS: EntityKey[] = ["companies", "jobs", "contacts", "notes", "events"];

function createdRange(from: Date | null, to: Date | null) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

export function safeTimeZone(value: string): string {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "Asia/Jerusalem";
  }
}

export async function countsPerUser(key: EntityKey, from: Date | null, to: Date | null): Promise<number[]> {
  const createdAt = createdRange(from, to);
  const where = createdAt ? { createdAt } : {};
  const rows =
    key === "companies"
      ? await prisma.company.groupBy({ by: ["userId"], where, _count: { _all: true } })
      : key === "jobs"
        ? await prisma.job.groupBy({ by: ["userId"], where, _count: { _all: true } })
        : key === "contacts"
          ? await prisma.contact.groupBy({ by: ["userId"], where, _count: { _all: true } })
          : key === "notes"
            ? await prisma.note.groupBy({ by: ["userId"], where, _count: { _all: true } })
            : await prisma.event.groupBy({ by: ["userId"], where, _count: { _all: true } });
  return rows.map((row) => row._count._all);
}

export async function countsByDay(
  key: CreatedKey,
  from: Date,
  to: Date,
  timeZone: string,
): Promise<Map<string, number>> {
  const table = Prisma.raw(`"${TABLES[key]}"`);
  const zone = safeTimeZone(timeZone);
  const rows = await prisma.$queryRaw<{ day: string; n: number }[]>(
    Prisma.sql`SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day, CAST(COUNT(*) AS INTEGER) AS n FROM ${table} WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
  );
  return new Map(rows.map((row) => [row.day, Number(row.n)]));
}

export async function entityCounts(from: Date | null, to: Date | null) {
  const entries = await Promise.all(ENTITY_KEYS.map(async (key) => [key, await countsPerUser(key, from, to)] as const));
  return Object.fromEntries(entries) as Record<EntityKey, number[]>;
}

export async function dailyCounts(keys: CreatedKey[], from: Date, to: Date, timeZone: string) {
  const entries = await Promise.all(keys.map(async (key) => [key, await countsByDay(key, from, to, timeZone)] as const));
  return Object.fromEntries(entries) as Record<CreatedKey, Map<string, number>>;
}
