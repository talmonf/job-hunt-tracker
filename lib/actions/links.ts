"use server";

import { redirect } from "next/navigation";
import type { EntityLinkKind } from "@prisma/client";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { requiredText } from "../forms";
import { displayPersonName, joinPersonName } from "../person-name";
import { normalizeConnection, normalizeWorksThere } from "../job-person";
import {
  isEntityLinkKind,
  isGoogleResourceName,
  isHttpUrl,
  kindFromUrl,
  labelFromUrl,
  linkIdentityFilters,
} from "../entity-links";

type ParentIds = {
  jobId?: string | null;
  noteId?: string | null;
  parentContactId?: string | null;
};

export async function addEntityLink(formData: FormData) {
  const user = await requireUser();
  const parent = await ownedParent(user.id, readParent(formData));
  const dest = parentPath(parent?.ids) ?? "/dashboard";
  if (!parent) redirect(`${dest}?error=required`);
  const parsed = await parseLinkInput(user.id, formData, parent.allowUrl, Boolean(parent.ids.jobId));
  if (!parsed) redirect(`${dest}?error=required`);
  if (parent.ids.parentContactId && parsed.contactId === parent.ids.parentContactId) redirect(dest);
  const filters = linkIdentityFilters(parsed);
  const parentKey = parent.ids.jobId ?? parent.ids.noteId ?? parent.ids.parentContactId ?? "";
  let created = false;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${user.id}:${parentKey}`}))`;
    if (filters.length) {
      const existing = await tx.entityLink.findFirst({
        where: { userId: user.id, ...parent.ids, OR: filters },
      });
      if (existing) return;
    }
    await tx.entityLink.create({
      data: {
        userId: user.id,
        ...parent.ids,
        ...parsed,
        ...(parent.ids.jobId ? readRelationship(formData) : {}),
      },
    });
    created = true;
  });
  redirect(created ? `${dest}?created=1` : dest);
}

export async function updateJobPerson(formData: FormData) {
  const user = await requireUser();
  const link = await prisma.entityLink.findFirst({
    where: { id: requiredText(formData.get("linkId")), userId: user.id, jobId: { not: null } },
  });
  if (!link?.jobId) redirect("/jobs");
  const relationship = readRelationship(formData);
  if (link.kind === "manual") {
    const firstName = requiredText(formData.get("firstName"));
    const lastName = requiredText(formData.get("lastName"));
    const displayName = joinPersonName(firstName, lastName);
    if (!displayName) redirect(`/jobs/${link.jobId}?error=required`);
    await prisma.entityLink.update({
      where: { id: link.id },
      data: {
        firstName,
        lastName,
        phone: requiredText(formData.get("phone")),
        email: requiredText(formData.get("email")),
        displayName,
        ...relationship,
      },
    });
  } else {
    await prisma.entityLink.update({
      where: { id: link.id },
      data: relationship,
    });
  }
  redirect(`/jobs/${link.jobId}?updated=1`);
}

export async function deleteEntityLink(formData: FormData) {
  const user = await requireUser();
  const link = await prisma.entityLink.findFirst({
    where: { id: requiredText(formData.get("linkId")), userId: user.id },
  });
  if (!link) redirect("/dashboard");
  await prisma.entityLink.delete({ where: { id: link.id } });
  redirect(`${parentPath({ jobId: link.jobId, noteId: link.noteId, parentContactId: link.parentContactId }) ?? "/dashboard"}?updated=1`);
}

export async function linkContactGoogle(formData: FormData) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id: requiredText(formData.get("contactId")), userId: user.id },
  });
  const resourceName = requiredText(formData.get("googleResourceName"));
  if (!contact || !isGoogleResourceName(resourceName)) redirect("/contacts?error=required");
  const title = requiredText(formData.get("title"));
  const workplace = requiredText(formData.get("workplace"));
  const name = {
    firstName: contact.firstName || requiredText(formData.get("firstName")),
    lastName: contact.lastName || requiredText(formData.get("lastName")),
    firstNameHe: contact.firstNameHe || requiredText(formData.get("firstNameHe")),
    lastNameHe: contact.lastNameHe || requiredText(formData.get("lastNameHe")),
  };
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      googleResourceName: resourceName,
      role: contact.role || title,
      workplace: contact.workplace || workplace,
      ...name,
      fullName: displayPersonName(name) || contact.fullName,
      mobile: contact.mobile || requiredText(formData.get("mobile")),
      email: contact.email || requiredText(formData.get("email")),
      address: contact.address || requiredText(formData.get("address")),
      linkedinUrl: contact.linkedinUrl || linkedInFromForm(formData),
    },
  });
  redirect(`/contacts/${contact.id}?updated=1`);
}

export async function unlinkContactGoogle(formData: FormData) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: { id: requiredText(formData.get("contactId")), userId: user.id },
  });
  if (!contact) redirect("/contacts");
  await prisma.contact.update({ where: { id: contact.id }, data: { googleResourceName: null } });
  redirect(`/contacts/${contact.id}?updated=1`);
}

function linkedInFromForm(formData: FormData): string {
  const value = requiredText(formData.get("linkedinUrl"));
  return isHttpUrl(value) ? value : "";
}

function readParent(formData: FormData): ParentIds {
  return {
    jobId: requiredText(formData.get("jobId")) || undefined,
    noteId: requiredText(formData.get("noteId")) || undefined,
    parentContactId: requiredText(formData.get("parentContactId")) || undefined,
  };
}

function parentPath(parent: ParentIds | null | undefined): string | null {
  if (!parent) return null;
  if (parent.jobId) return `/jobs/${parent.jobId}`;
  if (parent.noteId) return `/notes/${parent.noteId}`;
  if (parent.parentContactId) return `/contacts/${parent.parentContactId}`;
  return null;
}

async function ownedParent(userId: string, parent: ParentIds) {
  const keys = [parent.jobId, parent.noteId, parent.parentContactId].filter(Boolean);
  if (keys.length !== 1) return null;
  if (parent.jobId) {
    const job = await prisma.job.findFirst({ where: { id: parent.jobId, userId } });
    return job ? { ids: { jobId: job.id }, allowUrl: false } : null;
  }
  if (parent.noteId) {
    const note = await prisma.note.findFirst({ where: { id: parent.noteId, userId } });
    return note ? { ids: { noteId: note.id }, allowUrl: true } : null;
  }
  if (parent.parentContactId) {
    const contact = await prisma.contact.findFirst({ where: { id: parent.parentContactId, userId } });
    return contact ? { ids: { parentContactId: contact.id }, allowUrl: false } : null;
  }
  return null;
}

function readRelationship(formData: FormData) {
  return {
    worksThere: normalizeWorksThere(requiredText(formData.get("worksThere"))),
    connection: normalizeConnection(requiredText(formData.get("connection"))),
    relationshipNote: requiredText(formData.get("relationshipNote")),
  };
}

async function parseLinkInput(userId: string, formData: FormData, allowUrl: boolean, allowManual: boolean) {
  const kindRaw = requiredText(formData.get("kind"));
  const displayName = requiredText(formData.get("displayName"));
  const title = requiredText(formData.get("title"));
  const googleResourceName = requiredText(formData.get("googleResourceName"));
  const url = requiredText(formData.get("url"));
  let contactId = requiredText(formData.get("contactId")) || null;
  let kind: EntityLinkKind | null = isEntityLinkKind(kindRaw) ? kindRaw : null;

  if (!kind && url) {
    const fromUrl = kindFromUrl(url);
    if (fromUrl === "url" && !allowUrl) return null;
    kind = fromUrl;
  }
  if (!kind) return null;

  if (kind === "manual") {
    if (!allowManual) return null;
    const firstName = requiredText(formData.get("firstName"));
    const lastName = requiredText(formData.get("lastName"));
    const displayName = joinPersonName(firstName, lastName);
    if (!displayName) return null;
    return {
      kind,
      displayName,
      title: "",
      firstName,
      lastName,
      phone: requiredText(formData.get("phone")),
      email: requiredText(formData.get("email")),
      url: "",
      googleResourceName: null,
      contactId: null,
    };
  }

  if (kind === "local_contact") {
    const contact = contactId ? await prisma.contact.findFirst({ where: { id: contactId, userId } }) : null;
    if (!contact) return null;
    return {
      kind,
      displayName: displayName || contact.fullName,
      title: title || contact.role,
      contactId: contact.id,
      googleResourceName: contact.googleResourceName,
      url: contact.linkedinUrl || "",
    };
  }

  if (kind === "google_contact") {
    if (!isGoogleResourceName(googleResourceName) || !displayName) return null;
    if (!contactId) {
      const existing = await prisma.contact.findFirst({
        where: { userId, googleResourceName },
      });
      contactId = existing?.id ?? null;
    } else {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
      if (!contact) contactId = null;
    }
    return { kind, displayName, title, googleResourceName, url: "", contactId };
  }

  if (!isHttpUrl(url)) return null;
  if (kind === "url" && !allowUrl) return null;
  const resolvedKind = kindFromUrl(url);
  if (!resolvedKind) return null;
  if (resolvedKind === "url" && !allowUrl) return null;
  return {
    kind: resolvedKind,
    displayName: displayName || labelFromUrl(url),
    title,
    url,
    googleResourceName: null,
    contactId: null,
  };
}
