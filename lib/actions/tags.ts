import { Prisma, type TagColor } from "@prisma/client";
import { prisma } from "../prisma";
import { requiredText } from "../forms";
import { TAG_COLORS } from "../tags";

export type TagRow = { id: string; name: string; color: TagColor };

export type TagWriteResult = { ok: true; tag: TagRow } | { ok: false; error: "required" | "tagName" };

function readColor(value: FormDataEntryValue | null): TagColor | null {
  const text = requiredText(value);
  return (TAG_COLORS as readonly string[]).includes(text) ? (text as TagColor) : null;
}

async function nameTaken(userId: string, name: string, exceptId?: string) {
  const existing = await prisma.tag.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });
  return Boolean(existing);
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createTag(userId: string, formData: FormData): Promise<TagWriteResult> {
  const name = requiredText(formData.get("name"));
  const color = readColor(formData.get("color"));
  if (!name || !color) return { ok: false, error: "required" };
  if (await nameTaken(userId, name)) return { ok: false, error: "tagName" };
  try {
    const tag = await prisma.tag.create({ data: { userId, name, color } });
    return { ok: true, tag: { id: tag.id, name: tag.name, color: tag.color } };
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, error: "tagName" };
    throw error;
  }
}

export async function updateTag(userId: string, formData: FormData): Promise<TagWriteResult> {
  const id = requiredText(formData.get("id"));
  const name = requiredText(formData.get("name"));
  const color = readColor(formData.get("color"));
  const tag = id ? await prisma.tag.findFirst({ where: { id, userId } }) : null;
  if (!tag || !name || !color) return { ok: false, error: "required" };
  if (await nameTaken(userId, name, tag.id)) return { ok: false, error: "tagName" };
  try {
    const saved = await prisma.tag.update({ where: { id: tag.id }, data: { name, color } });
    return { ok: true, tag: { id: saved.id, name: saved.name, color: saved.color } };
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, error: "tagName" };
    throw error;
  }
}

export type TagUsage = {
  jobs: string[];
  contacts: string[];
  notes: string[];
  employments: string[];
  companies: string[];
};

export type TagDeleteResult =
  | { ok: true }
  | { ok: false; error: "required" | "confirm" }
  | { ok: false; error: "used"; usage: TagUsage };

function placeLabel(title: string, place: string) {
  const role = title.trim();
  const where = place.trim();
  if (role && where) return `${role} — ${where}`;
  return role || where || "—";
}

export async function tagUsage(userId: string, id: string): Promise<TagUsage | null> {
  const tag = await prisma.tag.findFirst({
    where: { id, userId },
    select: {
      jobs: { select: { job: { select: { title: true, companyName: true } } } },
      contacts: { select: { contact: { select: { fullName: true } } } },
      notes: { select: { note: { select: { title: true } } } },
      employments: { select: { employment: { select: { title: true, company: true } } } },
      companies: { select: { company: { select: { name: true } } } },
    },
  });
  if (!tag) return null;
  const sort = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  return {
    jobs: tag.jobs.map((row) => placeLabel(row.job.title, row.job.companyName)).sort(sort),
    contacts: tag.contacts.map((row) => row.contact.fullName.trim() || "—").sort(sort),
    notes: tag.notes.map((row) => row.note.title.trim() || "—").sort(sort),
    employments: tag.employments.map((row) => placeLabel(row.employment.title, row.employment.company)).sort(sort),
    companies: tag.companies.map((row) => row.company.name.trim() || "—").sort(sort),
  };
}

export function tagIsUsed(usage: TagUsage) {
  return usage.jobs.length + usage.contacts.length + usage.notes.length + usage.employments.length + usage.companies.length > 0;
}

export async function deleteTag(userId: string, formData: FormData): Promise<TagDeleteResult> {
  const id = requiredText(formData.get("id"));
  if (!id) return { ok: false, error: "required" };
  const usage = await tagUsage(userId, id);
  if (!usage) return { ok: true };
  if (formData.get("confirm") !== "1") {
    if (tagIsUsed(usage)) return { ok: false, error: "used", usage };
    return { ok: false, error: "confirm" };
  }
  await prisma.tag.deleteMany({ where: { id, userId } });
  return { ok: true };
}
