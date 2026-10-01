import { prisma } from "./prisma";
import { requiredText } from "./forms";

export async function replaceRecordTags(
  kind: "job" | "contact" | "note" | "employment",
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
  await prisma.employmentTag.deleteMany({ where: { employmentId: recordId, ...(ids.length ? { tagId: { notIn: ids } } : {}) } });
  if (ids.length) {
    await prisma.employmentTag.createMany({ data: ids.map((tagId) => ({ employmentId: recordId, tagId })), skipDuplicates: true });
  }
}
