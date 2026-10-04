import { prisma } from "./prisma";
import { requiredText } from "./forms";

export async function replaceRecordTags(
  kind: "job" | "contact" | "note" | "employment" | "company",
  recordId: string,
  userId: string,
  formData: FormData,
) {
  if (formData.get("tagsManaged") !== "1") return;
  const requested = [...new Set(formData.getAll("tagId").map((value) => requiredText(value)).filter(Boolean))];
  const owned = requested.length
    ? await prisma.tag.findMany({ where: { userId, id: { in: requested } }, select: { id: true } })
    : [];
  const ids = owned.map((tag) => tag.id);
  if (kind === "job") {
    await prisma.jobTag.deleteMany({ where: { jobId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
    if (ids.length) await prisma.jobTag.createMany({ data: ids.map((tagId) => ({ jobId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  if (kind === "contact") {
    await prisma.contactTag.deleteMany({ where: { contactId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
    if (ids.length) await prisma.contactTag.createMany({ data: ids.map((tagId) => ({ contactId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  if (kind === "note") {
    await prisma.noteTag.deleteMany({ where: { noteId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
    if (ids.length) await prisma.noteTag.createMany({ data: ids.map((tagId) => ({ noteId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  if (kind === "company") {
    await prisma.companyTag.deleteMany({ where: { companyId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
    if (ids.length) await prisma.companyTag.createMany({ data: ids.map((tagId) => ({ companyId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  await prisma.employmentTag.deleteMany({ where: { employmentId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
  if (ids.length) {
    await prisma.employmentTag.createMany({ data: ids.map((tagId) => ({ employmentId: recordId, tagId })), skipDuplicates: true });
  }
}

export async function copyCompanyTags(kind: "job" | "contact" | "note", recordId: string, companyIds: string[]) {
  const ids = [...new Set(companyIds.filter(Boolean))];
  if (!ids.length) return;
  const rows = await prisma.companyTag.findMany({ where: { companyId: { in: ids } }, select: { tagId: true } });
  const tagIds = [...new Set(rows.map((row) => row.tagId))];
  if (!tagIds.length) return;
  if (kind === "job") {
    await prisma.jobTag.createMany({ data: tagIds.map((tagId) => ({ jobId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  if (kind === "contact") {
    await prisma.contactTag.createMany({ data: tagIds.map((tagId) => ({ contactId: recordId, tagId })), skipDuplicates: true });
    return;
  }
  await prisma.noteTag.createMany({ data: tagIds.map((tagId) => ({ noteId: recordId, tagId })), skipDuplicates: true });
}
