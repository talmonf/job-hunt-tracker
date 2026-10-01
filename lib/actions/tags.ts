"use server";

import { redirect } from "next/navigation";
import type { TagColor } from "@prisma/client";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { requiredText } from "../forms";
import { TAG_COLORS } from "../tags";

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

export async function createTag(formData: FormData) {
  const user = await requireUser();
  const name = requiredText(formData.get("name"));
  const color = readColor(formData.get("color"));
  if (!name || !color) redirect("/settings?error=required");
  if (await nameTaken(user.id, name)) redirect("/settings?error=tagName");
  await prisma.tag.create({ data: { userId: user.id, name, color } });
  redirect("/settings?created=1");
}

export async function updateTag(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("id"));
  const name = requiredText(formData.get("name"));
  const color = readColor(formData.get("color"));
  const tag = id ? await prisma.tag.findFirst({ where: { id, userId: user.id } }) : null;
  if (!tag || !name || !color) redirect("/settings?error=required");
  if (await nameTaken(user.id, name, tag.id)) redirect("/settings?error=tagName");
  await prisma.tag.update({ where: { id: tag.id }, data: { name, color } });
  redirect("/settings?updated=1");
}

export async function deleteTag(formData: FormData) {
  const user = await requireUser();
  await prisma.tag.deleteMany({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  redirect("/settings?updated=1");
}
