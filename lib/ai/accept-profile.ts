import { randomUUID } from "crypto";
import type { Prisma, TagColor } from "@prisma/client";
import { distinctCompanyNames } from "../company-name";
import { parseCareerDate } from "../forms";
import { employmentNoteLabel, experienceNoteBodies } from "../notes";
import { firstFreeTagColor } from "../tags";
import { uniqueSkillNames, type Proposal } from "./proposal";

export type ProfileImportPlan = {
  employments: Prisma.EmploymentCreateManyInput[];
  bullets: Prisma.EmploymentBulletCreateManyInput[];
  notes: Prisma.NoteCreateManyInput[];
  companies: string[];
  educations: Prisma.EducationCreateManyInput[];
  volunteers: Prisma.VolunteerRoleCreateManyInput[];
  certificates: Prisma.CertificateCreateManyInput[];
  skillNames: string[];
};

export type SkillTagPlan = {
  create: { id: string; name: string; color: TagColor }[];
  tagIds: string[];
};

/** Rows for one profile import. Ids are assigned up front so every insert can be a single createMany. */
export function planProfileImport(
  userId: string,
  proposal: Proposal,
  timeZone: string,
  newId: () => string = randomUUID,
): ProfileImportPlan {
  const employments: Prisma.EmploymentCreateManyInput[] = [];
  const bullets: Prisma.EmploymentBulletCreateManyInput[] = [];
  const notes: Prisma.NoteCreateManyInput[] = [];

  for (const row of proposal.employments) {
    const id = newId();
    employments.push({
      id,
      userId,
      title: row.title || row.company,
      company: row.company || row.title,
      startDate: parseCareerDate(row.startDate, timeZone),
      endDate: row.isCurrent ? null : parseCareerDate(row.endDate, timeZone),
      isCurrent: row.isCurrent,
      descriptionEn: row.bullets.map((bullet) => bullet.textEn).filter(Boolean).join("\n"),
      descriptionHe: row.bullets.map((bullet) => bullet.textHe).filter(Boolean).join("\n"),
    });
    row.bullets.forEach((bullet, position) => {
      const bulletId = newId();
      bullets.push({
        id: bulletId,
        employmentId: id,
        userId,
        position,
        textEn: bullet.textEn,
        textHe: bullet.textHe,
      });
    });
    if (row.createNote) {
      const title = employmentNoteLabel(row);
      if (title) {
        const bodies = experienceNoteBodies(row.bullets);
        notes.push({
          userId,
          title,
          type: "work_experience",
          employmentId: id,
          bodyEn: bodies.bodyEn,
          bodyHe: bodies.bodyHe,
        });
      }
    }
  }

  return {
    employments,
    bullets,
    notes,
    companies: distinctCompanyNames(proposal.employments.map((row) => row.company)),
    educations: proposal.educations.map((row) => ({
      userId,
      school: row.school,
      degree: row.degree,
      field: row.field,
      startDate: parseCareerDate(row.startDate, timeZone),
      endDate: parseCareerDate(row.endDate, timeZone),
    })),
    volunteers: proposal.volunteers.map((row) => ({
      userId,
      organization: row.organization,
      role: row.role,
      startDate: parseCareerDate(row.startDate, timeZone),
      endDate: parseCareerDate(row.endDate, timeZone),
      descriptionEn: row.textEn,
      descriptionHe: row.textHe,
    })),
    certificates: proposal.certificates.map((row) => ({
      userId,
      name: row.name,
      issuer: row.issuer,
      issuedOn: parseCareerDate(row.issuedOn, timeZone),
      url: row.url,
    })),
    skillNames: uniqueSkillNames(proposal.skills),
  };
}

/** Reuse a tag with the same name, or plan a new one. Does not delete tags used elsewhere. */
export function resolveSkillTags(
  names: readonly string[],
  existing: readonly { id: string; name: string; color: TagColor }[],
  newId: () => string = randomUUID,
): SkillTagPlan {
  const byName = new Map(existing.map((tag) => [tag.name.trim().toLowerCase(), tag]));
  const used: TagColor[] = existing.map((tag) => tag.color);
  const create: SkillTagPlan["create"] = [];
  const tagIds: string[] = [];
  for (const name of uniqueSkillNames(names)) {
    const match = byName.get(name.toLowerCase());
    if (match) {
      tagIds.push(match.id);
      continue;
    }
    const color = firstFreeTagColor(used);
    used.push(color);
    const id = newId();
    const tag = { id, name, color };
    create.push(tag);
    tagIds.push(id);
    byName.set(name.toLowerCase(), tag);
  }
  return { create, tagIds };
}
