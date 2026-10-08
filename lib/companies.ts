import { Prisma } from "@prisma/client";
import { companyNameKey, defaultWorkplaceName, sameCompanyName } from "./company-name";
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

export type SavedContactCompany = ContactCompanyLink & { companyId: string; name: string };

export async function replaceContactCompanies(db: CompanyDb, userId: string, contactId: string, links: ContactCompanyLink[]) {
  const seen = new Set<string>();
  const rows: SavedContactCompany[] = [];
  for (const link of links) {
    const company = await ensureCompany(db, userId, link.name);
    if (!company || seen.has(company.id)) continue;
    seen.add(company.id);
    rows.push({ ...link, companyId: company.id, name: company.name });
  }
  const previous = await db.contactCompany.findMany({ where: { contactId }, select: { companyId: true } });
  const previousIds = new Set(previous.map((row) => row.companyId));
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
  const added = rows.filter((row) => !previousIds.has(row.companyId)).map((row) => row.companyId);
  if (added.length) {
    await db.company.updateMany({ where: { id: { in: added }, userId }, data: { following: true } });
  }
  return rows;
}

/** Workplace names become companies, and each contact's workplace is one of their companies. */
export async function publishContactCompanies(userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    select: {
      id: true,
      workplace: true,
      companies: {
        select: {
          endedOn: true,
          endedUnknown: true,
          company: { select: { id: true, name: true, following: true } },
        },
      },
    },
  });
  for (const contact of contacts) {
    const linked = contact.companies.map((row) => ({
      name: row.company.name,
      endedOn: row.endedOn,
      endedUnknown: row.endedUnknown,
    }));
    const workplace = contact.workplace.trim();
    if (workplace && !linked.some((company) => sameCompanyName(company.name, workplace))) {
      const company = await ensureCompany(prisma, userId, workplace);
      if (company) {
        await prisma.contactCompany.upsert({
          where: { contactId_companyId: { contactId: contact.id, companyId: company.id } },
          create: { contactId: contact.id, companyId: company.id },
          update: {},
        });
        if (!company.following) {
          await prisma.company.update({ where: { id: company.id }, data: { following: true } });
        }
        linked.unshift({ name: company.name, endedOn: "", endedUnknown: false });
      }
    }
    const next = defaultWorkplaceName(
      workplace,
      linked.map((company) => ({
        name: company.name,
        current: !company.endedOn && !company.endedUnknown,
      })),
    );
    if (next !== contact.workplace) {
      await prisma.contact.update({ where: { id: contact.id }, data: { workplace: next } });
    }
  }
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
