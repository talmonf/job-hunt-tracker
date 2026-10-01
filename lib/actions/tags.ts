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

export async function deleteTag(userId: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: "required" }> {
  const id = requiredText(formData.get("id"));
  if (!id) return { ok: false, error: "required" };
  await prisma.tag.deleteMany({ where: { id, userId } });
  return { ok: true };
}
