"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { parseDateOnly, requiredText } from "../forms";
import { normalizeContactStatus } from "../contact-status";
import { noteTypesFor, subjectKind } from "../notes";
import { isGoogleResourceName, isHttpUrl } from "../entity-links";
import { displayPersonName } from "../person-name";
import type { NoteType } from "@prisma/client";
import { replaceRecordTags } from "../tag-assign";

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const data = await noteFields(formData, user.id);
  if (!data) redirect("/notes?error=required");
  const note = await prisma.note.create({ data: { userId: user.id, ...data } });
  await replaceRecordTags("note", note.id, user.id, formData);
  redirect(`/notes/${note.id}?created=1`);
}

export async function updateNote(formData: FormData) {
  const user = await requireUser();
  const note = await ownedNote(user.id, requiredText(formData.get("noteId")));
  if (!note) redirect("/notes?error=required");
  const data = await noteFields(formData, user.id);
  if (!data) redirect(`/notes/${note.id}?error=required`);
  await prisma.note.update({ where: { id: note.id }, data });
  await replaceRecordTags("note", note.id, user.id, formData);
  redirect(`/notes/${note.id}?updated=1`);
}

export async function cloneNote(formData: FormData) {
  const user = await requireUser();
  const note = await ownedNote(user.id, requiredText(formData.get("noteId")));
  if (!note) redirect("/notes?error=required");
  const suffix = user.uiLanguage === "he" ? "(עותק)" : "(copy)";
  const [links, tagRows] = await Promise.all([
    prisma.entityLink.findMany({ where: { noteId: note.id, userId: user.id } }),
    prisma.noteTag.findMany({ where: { noteId: note.id } }),
  ]);
  const copy = await prisma.note.create({
    data: {
      userId: user.id,
      title: `${note.title} ${suffix}`,
      jobId: note.jobId,
      contactId: note.contactId,
      type: note.type,
      additionalInfo: note.additionalInfo,
      bodyEn: note.bodyEn,
      bodyHe: note.bodyHe,
      entityLinks: {
        create: links.map((link) => ({
          userId: user.id,
          kind: link.kind,
          displayName: link.displayName,
          title: link.title,
          googleResourceName: link.googleResourceName,
          url: link.url,
          contactId: link.contactId,
        })),
      },
      tags: {
        create: tagRows.map((row) => ({ tagId: row.tagId })),
      },
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
  const subject = parseSubject(requiredText(formData.get("subject")));
  if (!subject) return null;
  const type = requiredText(formData.get("type")) as NoteType;
  if (!(noteTypesFor(subject.kind) as readonly string[]).includes(type)) return null;
  let jobId: string | null = null;
  let contactId: string | null = null;
  if (subject.kind === "job") {
    const job = await prisma.job.findFirst({ where: { id: subject.id, userId } });
    if (!job) return null;
    jobId = job.id;
  } else if (subject.kind === "contact") {
    const contact = await prisma.contact.findFirst({ where: { id: subject.id, userId } });
    if (!contact) return null;
    contactId = contact.id;
  }
  return {
    title,
    type,
    jobId,
    contactId,
    additionalInfo: String(formData.get("additionalInfo") ?? ""),
    bodyEn: String(formData.get("bodyEn") ?? ""),
    bodyHe: String(formData.get("bodyHe") ?? ""),
  };
}

function parseSubject(raw: string): { kind: ReturnType<typeof subjectKind>; id: string } | null {
  if (!raw) return { kind: "general", id: "" };
  if (raw.startsWith("job:")) {
    const id = raw.slice("job:".length);
    return id ? { kind: "job", id } : null;
  }
  if (raw.startsWith("contact:")) {
    const id = raw.slice("contact:".length);
    return id ? { kind: "contact", id } : null;
  }
  return null;
}

export async function createContact(formData: FormData) {
  const user = await requireUser();
  const name = contactName(formData);
  if (!name.fullName) redirect("/contacts?error=required");
  const contact = await prisma.contact.create({
    data: {
      userId: user.id,
      ...contactData(formData, user.timezone),
      status: statusFromForm(formData) ?? "",
      ...name,
      googleResourceName: googleResourceFromForm(formData) ?? null,
    },
  });
  await replaceRecordTags("contact", contact.id, user.id, formData);
  const linkId = requiredText(formData.get("entityLinkId"));
  if (linkId) {
    const link = await prisma.entityLink.findFirst({
      where: { id: linkId, userId: user.id, kind: "manual", jobId: { not: null } },
    });
    if (link) {
      await prisma.entityLink.update({
        where: { id: link.id },
        data: {
          kind: "local_contact",
          contactId: contact.id,
          displayName: contact.fullName,
          title: contact.role,
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
        },
      });
    }
  }
  redirect(`/contacts/${contact.id}?created=1`);
}

export async function updateContact(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("contactId"));
  const name = contactName(formData);
  const existing = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!existing || !name.fullName) redirect("/contacts?error=required");
  const googleResourceName = googleResourceFromForm(formData);
  const status = statusFromForm(formData);
  await prisma.contact.update({
    where: { id },
    data: {
      ...contactData(formData, user.timezone),
      ...name,
      ...(status !== undefined ? { status } : {}),
      ...(googleResourceName !== undefined ? { googleResourceName } : {}),
    },
  });
  await replaceRecordTags("contact", id, user.id, formData);
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

function statusFromForm(formData: FormData): string | undefined {
  if (!formData.has("status")) return undefined;
  return normalizeContactStatus(requiredText(formData.get("status")));
}

function contactName(formData: FormData) {
  const name = {
    firstName: requiredText(formData.get("firstName")),
    lastName: requiredText(formData.get("lastName")),
    firstNameHe: requiredText(formData.get("firstNameHe")),
    lastNameHe: requiredText(formData.get("lastNameHe")),
  };
  return { ...name, fullName: displayPersonName(name) };
}

function googleResourceFromForm(formData: FormData): string | null | undefined {
  if (!formData.has("googleResourceName")) return undefined;
  const value = requiredText(formData.get("googleResourceName"));
  if (!value || !isGoogleResourceName(value)) return null;
  return value;
}

function contactData(formData: FormData, timeZone: string) {
  return {
    role: requiredText(formData.get("role")),
    workplace: requiredText(formData.get("workplace")),
    howWeMet: requiredText(formData.get("howWeMet")),
    lastChannel: requiredText(formData.get("lastChannel")),
    summary: String(formData.get("summary") ?? ""),
    contactedAt: parseDateOnly(formData.get("contactedAt"), timeZone),
    nextActionDate: parseDateOnly(formData.get("nextActionDate"), timeZone),
    nextAction: requiredText(formData.get("nextAction")),
    mobile: requiredText(formData.get("mobile")),
    email: requiredText(formData.get("email")),
    address: requiredText(formData.get("address")),
    contactDetails: String(formData.get("contactDetails") ?? ""),
    linkedinUrl: (() => {
      const value = requiredText(formData.get("linkedinUrl"));
      return isHttpUrl(value) ? value : "";
    })(),
    willingToRecommend: formData.get("willingToRecommend") === "1",
  };
}
