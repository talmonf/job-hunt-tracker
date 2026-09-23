"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { parseDateOnly, requiredText } from "../forms";

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const title = requiredText(formData.get("title"));
  const bodyEn = String(formData.get("bodyEn") ?? "");
  const bodyHe = String(formData.get("bodyHe") ?? "");
  if (!title || (!bodyEn.trim() && !bodyHe.trim())) redirect("/notes?error=required");
  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title,
      versions: { create: { version: 1, bodyEn, bodyHe } },
    },
  });
  redirect(`/notes/${note.id}?created=1`);
}

export async function saveNoteVersion(formData: FormData) {
  const user = await requireUser();
  const note = await prisma.note.findFirst({
    where: { id: requiredText(formData.get("noteId")), userId: user.id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!note) redirect("/notes?error=required");
  const bodyEn = String(formData.get("bodyEn") ?? "");
  const bodyHe = String(formData.get("bodyHe") ?? "");
  if (!bodyEn.trim() && !bodyHe.trim()) redirect(`/notes/${note.id}?error=required`);
  const title = requiredText(formData.get("title")) || note.title;
  await prisma.note.update({ where: { id: note.id }, data: { title } });
  await prisma.noteVersion.create({
    data: { noteId: note.id, version: (note.versions[0]?.version ?? 0) + 1, bodyEn, bodyHe },
  });
  redirect(`/notes/${note.id}?created=1`);
}

export async function deleteNote(formData: FormData) {
  const user = await requireUser();
  await prisma.note.deleteMany({ where: { id: requiredText(formData.get("noteId")), userId: user.id } });
  redirect("/notes?updated=1");
}

export async function createContact(formData: FormData) {
  const user = await requireUser();
  const fullName = requiredText(formData.get("fullName"));
  if (!fullName) redirect("/contacts?error=required");
  const contact = await prisma.contact.create({ data: { userId: user.id, ...contactData(formData, user.timezone), fullName } });
  redirect(`/contacts/${contact.id}?created=1`);
}

export async function updateContact(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("contactId"));
  const fullName = requiredText(formData.get("fullName"));
  const existing = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!existing || !fullName) redirect("/contacts?error=required");
  await prisma.contact.update({ where: { id }, data: { ...contactData(formData, user.timezone), fullName } });
  redirect(`/contacts/${id}?updated=1`);
}

export async function deleteContact(formData: FormData) {
  const user = await requireUser();
  await prisma.contact.deleteMany({ where: { id: requiredText(formData.get("contactId")), userId: user.id } });
  redirect("/contacts?updated=1");
}

function contactData(formData: FormData, timeZone: string) {
  return {
    role: requiredText(formData.get("role")),
    workplace: requiredText(formData.get("workplace")),
    howWeMet: requiredText(formData.get("howWeMet")),
    lastChannel: requiredText(formData.get("lastChannel")),
    status: requiredText(formData.get("status")),
    summary: String(formData.get("summary") ?? ""),
    contactedAt: parseDateOnly(formData.get("contactedAt"), timeZone),
    nextActionDate: parseDateOnly(formData.get("nextActionDate"), timeZone),
    nextAction: requiredText(formData.get("nextAction")),
    contactDetails: String(formData.get("contactDetails") ?? ""),
    willingToRecommend: formData.get("willingToRecommend") === "1",
  };
}
