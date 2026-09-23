"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { parseDateOnly, requiredText } from "../forms";
import { removeStored, saveUpload } from "../files";

export async function saveAbout(formData: FormData) {
  const user = await requireUser();
  const data = {
    headline: requiredText(formData.get("headline")),
    aboutEn: String(formData.get("aboutEn") ?? ""),
    aboutHe: String(formData.get("aboutHe") ?? ""),
  };
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  redirect("/profile?updated=1");
}

export async function saveEmployment(formData: FormData) {
  const user = await requireUser();
  const title = requiredText(formData.get("title"));
  const company = requiredText(formData.get("company"));
  if (!title || !company) redirect("/profile?error=required");
  const data = {
    title,
    company,
    startDate: parseDateOnly(formData.get("startDate"), user.timezone),
    endDate: parseDateOnly(formData.get("endDate"), user.timezone),
    isCurrent: formData.get("isCurrent") === "1",
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    descriptionHe: String(formData.get("descriptionHe") ?? ""),
  };
  const id = requiredText(formData.get("id"));
  if (id) {
    const row = await prisma.employment.findFirst({ where: { id, userId: user.id } });
    if (!row) redirect("/profile?error=required");
    await prisma.employment.update({ where: { id }, data });
  } else {
    await prisma.employment.create({ data: { userId: user.id, ...data } });
  }
  redirect("/profile?updated=1");
}

export async function deleteEmployment(formData: FormData) {
  const user = await requireUser();
  await prisma.employment.deleteMany({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  redirect("/profile?updated=1");
}

export async function saveEducation(formData: FormData) {
  const user = await requireUser();
  const school = requiredText(formData.get("school"));
  if (!school) redirect("/profile?error=required");
  const data = {
    school,
    degree: requiredText(formData.get("degree")),
    field: requiredText(formData.get("field")),
    startDate: parseDateOnly(formData.get("startDate"), user.timezone),
    endDate: parseDateOnly(formData.get("endDate"), user.timezone),
  };
  const id = requiredText(formData.get("id"));
  if (id) {
    const row = await prisma.education.findFirst({ where: { id, userId: user.id } });
    if (!row) redirect("/profile?error=required");
    await prisma.education.update({ where: { id }, data });
  } else {
    await prisma.education.create({ data: { userId: user.id, ...data } });
  }
  redirect("/profile?updated=1");
}

export async function deleteEducation(formData: FormData) {
  const user = await requireUser();
  await prisma.education.deleteMany({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  redirect("/profile?updated=1");
}

export async function saveVolunteer(formData: FormData) {
  const user = await requireUser();
  const organization = requiredText(formData.get("organization"));
  if (!organization) redirect("/profile?error=required");
  const data = {
    organization,
    role: requiredText(formData.get("role")),
    startDate: parseDateOnly(formData.get("startDate"), user.timezone),
    endDate: parseDateOnly(formData.get("endDate"), user.timezone),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    descriptionHe: String(formData.get("descriptionHe") ?? ""),
  };
  const id = requiredText(formData.get("id"));
  if (id) {
    const row = await prisma.volunteerRole.findFirst({ where: { id, userId: user.id } });
    if (!row) redirect("/profile?error=required");
    await prisma.volunteerRole.update({ where: { id }, data });
  } else {
    await prisma.volunteerRole.create({ data: { userId: user.id, ...data } });
  }
  redirect("/profile?updated=1");
}

export async function deleteVolunteer(formData: FormData) {
  const user = await requireUser();
  await prisma.volunteerRole.deleteMany({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  redirect("/profile?updated=1");
}

export async function saveCertificate(formData: FormData) {
  const user = await requireUser();
  const name = requiredText(formData.get("name"));
  if (!name) redirect("/profile?error=required");
  const data = {
    name,
    issuer: requiredText(formData.get("issuer")),
    issuedOn: parseDateOnly(formData.get("issuedOn"), user.timezone),
    url: requiredText(formData.get("url")),
  };
  const id = requiredText(formData.get("id"));
  if (id) {
    const row = await prisma.certificate.findFirst({ where: { id, userId: user.id } });
    if (!row) redirect("/profile?error=required");
    await prisma.certificate.update({ where: { id }, data });
  } else {
    await prisma.certificate.create({ data: { userId: user.id, ...data } });
  }
  redirect("/profile?updated=1");
}

export async function deleteCertificate(formData: FormData) {
  const user = await requireUser();
  await prisma.certificate.deleteMany({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  redirect("/profile?updated=1");
}

export async function uploadProfileFile(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/profile?error=required");
  const saved = await saveUpload(user.id, "profile", file);
  if (!saved) redirect("/profile?error=storage");
  await prisma.profileFile.create({ data: { userId: user.id, ...saved } });
  redirect("/profile?created=1");
}

export async function deleteProfileFile(formData: FormData) {
  const user = await requireUser();
  const row = await prisma.profileFile.findFirst({ where: { id: requiredText(formData.get("id")), userId: user.id } });
  if (!row) redirect("/profile");
  await prisma.profileFile.delete({ where: { id: row.id } });
  await removeStored(user.id, row.objectKey);
  redirect("/profile?updated=1");
}
