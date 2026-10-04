"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { requiredText } from "../forms";
import { companyNameKey } from "../company-name";
import { readFoundedOn } from "../companies";
import { isCompanySize, type CompanySize } from "../company-size";
import { replaceRecordTags } from "../tag-assign";

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const name = requiredText(formData.get("name"));
  const nameKey = companyNameKey(name);
  if (!nameKey) redirect("/companies?error=required");
  const fields = companyFields(formData);
  if (fields === "invalid") redirect("/companies?error=date");
  const existing = await prisma.company.findUnique({ where: { userId_nameKey: { userId: user.id, nameKey } } });
  if (existing) redirect(`/companies/${existing.id}`);
  const company = await prisma.company.create({
    data: {
      userId: user.id,
      name,
      nameKey,
      following: true,
      ...fields,
    },
  });
  await replaceRecordTags("company", company.id, user.id, formData);
  redirect(`/companies/${company.id}?created=1`);
}

export async function updateCompany(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("companyId"));
  const company = await prisma.company.findFirst({ where: { id, userId: user.id } });
  if (!company) redirect("/companies?error=required");
  const name = requiredText(formData.get("name"));
  const nameKey = companyNameKey(name);
  if (!nameKey) redirect(`/companies/${company.id}?error=required`);
  const fields = companyFields(formData);
  if (fields === "invalid") redirect(`/companies/${company.id}?error=date`);
  if (nameKey !== company.nameKey) {
    const clash = await prisma.company.findUnique({ where: { userId_nameKey: { userId: user.id, nameKey } } });
    if (clash) redirect(`/companies/${company.id}?error=companyName`);
  }
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name,
      nameKey,
      following: formData.get("following") === "1",
      ...fields,
    },
  });
  await replaceRecordTags("company", company.id, user.id, formData);
  if (name !== company.name) {
    await prisma.job.updateMany({ where: { companyId: company.id }, data: { companyName: name } });
  }
  redirect(`/companies/${company.id}?updated=1`);
}

export async function deleteCompany(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("companyId"));
  const company = await prisma.company.findFirst({ where: { id, userId: user.id } });
  if (!company) redirect("/companies");
  const jobs = await prisma.job.count({ where: { companyId: company.id } });
  if (jobs) redirect(`/companies/${company.id}?error=jobs`);
  await prisma.company.delete({ where: { id: company.id } });
  redirect("/companies?updated=1");
}

function companyFields(formData: FormData) {
  const foundedOn = readFoundedOn(formData.get("foundedOn"));
  if (foundedOn === "invalid") return "invalid";
  const rawSize = requiredText(formData.get("employeeCount"));
  let employeeCount: CompanySize | null = null;
  if (rawSize) {
    if (!isCompanySize(rawSize)) return "invalid";
    employeeCount = rawSize;
  }
  return {
    offices: requiredText(formData.get("offices")),
    websiteHome: requiredText(formData.get("websiteHome")),
    websitePeople: requiredText(formData.get("websitePeople")),
    websiteJobs: requiredText(formData.get("websiteJobs")),
    linkedinUrl: requiredText(formData.get("linkedinUrl")),
    foundedOn,
    employeeCount,
  };
}
