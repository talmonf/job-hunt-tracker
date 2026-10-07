import { Prisma } from "@prisma/client";
import { companyNameKey } from "./company-name";
import { ACTIVE_JOB_STATUSES } from "./events";
import { canonicalPartialDate } from "./partial-date";
import { prisma } from "./prisma";

export type CompanyDb = Prisma.TransactionClient | typeof prisma;

export { companyNameKey };

export async function ensureCompany(db: CompanyDb, userId: string, name: string) {
  const trimmed = name.trim();
  const nameKey = companyNameKey(trimmed);
  if (!nameKey) return null;
  const existing = await db.company.findUnique({ where: { userId_nameKey: { userId, nameKey } } });
  if (existing) return existing;
  try {
    return await db.company.create({
      data: { userId, name: trimmed, nameKey, following: true },
    });
  } catch (error) {
    if (!isUnique(error)) throw error;
    return db.company.findUnique({ where: { userId_nameKey: { userId, nameKey } } });
  }
}

export type ContactCompanyLink = {
  name: string;
  startedOn: string;
  startedUnknown: boolean;
  endedOn: string;
  endedUnknown: boolean;
};

export function readContactCompanyLinks(formData: FormData): ContactCompanyLink[] | "invalid" {
  const names = formData.getAll("companyNames").map((value) => String(value).trim());
  const from = formData.getAll("companyFrom").map(String);
  const fromUnknown = formData.getAll("companyFromUnknown").map(String);
  const to = formData.getAll("companyTo").map(String);
  const toUnknown = formData.getAll("companyToUnknown").map(String);
  if (from.length !== names.length || fromUnknown.length !== names.length || to.length !== names.length || toUnknown.length !== names.length) {
    return "invalid";
  }
  const links: ContactCompanyLink[] = [];
  for (let index = 0; index < names.length; index += 1) {
    if (!names[index]) continue;
    const started = readBound(from[index] ?? "", fromUnknown[index] === "1");
    const ended = readBound(to[index] ?? "", toUnknown[index] === "1");
    if (started === "invalid" || ended === "invalid") return "invalid";
    links.push({ name: names[index], ...startedFields(started), ...endedFields(ended) });
  }
  return links;
}

export function readFoundedOn(value: FormDataEntryValue | null): string | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return canonicalPartialDate(text) ?? "invalid";
}

export async function replaceContactCompanies(db: CompanyDb, userId: string, contactId: string, links: ContactCompanyLink[]) {
  const seen = new Set<string>();
  const rows: Array<ContactCompanyLink & { companyId: string }> = [];
  for (const link of links) {
    const company = await ensureCompany(db, userId, link.name);
    if (!company || seen.has(company.id)) continue;
    seen.add(company.id);
    rows.push({ ...link, companyId: company.id });
  }
  await db.contactCompany.deleteMany({ where: { contactId } });
  if (!rows.length) return [];
  await db.contactCompany.createMany({
    data: rows.map((row) => ({
      contactId,
      companyId: row.companyId,
      startedOn: row.startedOn,
      startedUnknown: row.startedUnknown,
      endedOn: row.endedOn,
      endedUnknown: row.endedUnknown,
    })),
  });
  return rows.map((row) => row.companyId);
}

function readBound(raw: string, unknown: boolean): { text: string; unknown: boolean } | "invalid" {
  if (unknown) return { text: "", unknown: true };
  const trimmed = raw.trim();
  if (!trimmed) return { text: "", unknown: false };
  const text = canonicalPartialDate(trimmed);
  if (!text) return "invalid";
  return { text, unknown: false };
}

function startedFields(bound: { text: string; unknown: boolean }) {
  return { startedOn: bound.text, startedUnknown: bound.unknown };
}

function endedFields(bound: { text: string; unknown: boolean }) {
  return { endedOn: bound.text, endedUnknown: bound.unknown };
}

function isUnique(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const activeJobStatuses = new Set<string>(ACTIVE_JOB_STATUSES);

/** One role always shows. Several roles show only the ones still being pursued. */
export function jobsForCompanyStatus<T extends { status: string }>(jobs: readonly T[]): T[] {
  if (jobs.length <= 1) return [...jobs];
  return jobs.filter((job) => activeJobStatuses.has(job.status));
}
