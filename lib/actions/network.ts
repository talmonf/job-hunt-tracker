"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { parseDateOnly, requiredText } from "../forms";
import { normalizeContactStatus } from "../contact-status";
import { NOTE_TYPES } from "../notes";
import type { NoteType } from "@prisma/client";

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const data = await noteFields(formData, user.id);
  if (!data) redirect("/notes?error=required");
  const note = await prisma.note.create({ data: { userId: user.id, ...data } });
  redirect(`/notes/${note.id}?created=1`);
}

export async function updateNote(formData: FormData) {
  const user = await requireUser();
  const note = await ownedNote(user.id, requiredText(formData.get("noteId")));
  if (!note) redirect("/notes?error=required");
  const data = await noteFields(formData, user.id);
  if (!data) redirect(`/notes/${note.id}?error=required`);
  await prisma.note.update({ where: { id: note.id }, data });
  redirect(`/notes/${note.id}?updated=1`);
}

export async function cloneNote(formData: FormData) {
  const user = await requireUser();
  const note = await ownedNote(user.id, requiredText(formData.get("noteId")));
  if (!note) redirect("/notes?error=required");
  const suffix = user.uiLanguage === "he" ? "(עותק)" : "(copy)";
  const copy = await prisma.note.create({
    data: {
      userId: user.id,
      title: `${note.title} ${suffix}`,
      jobId: note.jobId,
      type: note.type,
      additionalInfo: note.additionalInfo,
      bodyEn: note.bodyEn,
      bodyHe: note.bodyHe,
    },
  });
  redirect(`/notes/${copy.id}?created=1`);
}

export async function deleteNote(formData: FormData) {
  const user = await requireUser();
  await prisma.note.deleteMany({ where: { id: requiredText(formData.get("noteId")), userId: user.id } });
  redirect("/notes?updated=1");
}

async function ownedNote(userId: string, id: string) {
  if (!id) return null;
  return prisma.note.findFirst({ where: { id, userId } });
}

async function noteFields(formData: FormData, userId: string) {
  const title = requiredText(formData.get("title"));
  if (!title) return null;
  const type = requiredText(formData.get("type")) as NoteType;
  if (!NOTE_TYPES.includes(type)) return null;
  const jobId = requiredText(formData.get("jobId"));
  const job = jobId ? await prisma.job.findFirst({ where: { id: jobId, userId } }) : null;
  return {
    title,
    type,
    jobId: job?.id ?? null,
    additionalInfo: String(formData.get("additionalInfo") ?? ""),
    bodyEn: String(formData.get("bodyEn") ?? ""),
    bodyHe: String(formData.get("bodyHe") ?? ""),
  };
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

export async function patchContact(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("contactId"));
  const existing = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!existing) return;
  const field = requiredText(formData.get("field"));
  const value = formData.get("value");
  if (field === "status") {
    await prisma.contact.update({ where: { id }, data: { status: normalizeContactStatus(requiredText(value)) } });
  } else if (field === "nextActionDate") {
    const raw = requiredText(value);
    if (!raw) {
      await prisma.contact.update({ where: { id }, data: { nextActionDate: null } });
    } else {
      const parsed = parseDateOnly(raw, user.timezone);
      if (!parsed) return;
      await prisma.contact.update({ where: { id }, data: { nextActionDate: parsed } });
    }
  } else if (field === "willingToRecommend") {
    await prisma.contact.update({ where: { id }, data: { willingToRecommend: String(value ?? "") === "1" } });
  } else {
    return;
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/dashboard");
}

function contactData(formData: FormData, timeZone: string) {
  return {
    role: requiredText(formData.get("role")),
    workplace: requiredText(formData.get("workplace")),
    howWeMet: requiredText(formData.get("howWeMet")),
    lastChannel: requiredText(formData.get("lastChannel")),
    status: normalizeContactStatus(requiredText(formData.get("status"))),
    summary: String(formData.get("summary") ?? ""),
    contactedAt: parseDateOnly(formData.get("contactedAt"), timeZone),
    nextActionDate: parseDateOnly(formData.get("nextActionDate"), timeZone),
    nextAction: requiredText(formData.get("nextAction")),
    contactDetails: String(formData.get("contactDetails") ?? ""),
    willingToRecommend: formData.get("willingToRecommend") === "1",
  };
}
