import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { distinctCompanyNames } from "../company-name";
import { parseCareerDate } from "../forms";
import { employmentNoteLabel, experienceNoteBodies } from "../notes";
import type { Proposal } from "./proposal";

export type ProfileImportPlan = {
  employments: Prisma.EmploymentCreateManyInput[];
  bullets: Prisma.EmploymentBulletCreateManyInput[];
  notes: Prisma.NoteCreateManyInput[];
  companies: string[];
  educations: Prisma.EducationCreateManyInput[];
  volunteers: Prisma.VolunteerRoleCreateManyInput[];
  certificates: Prisma.CertificateCreateManyInput[];
  labels: Prisma.ProfileLabelCreateManyInput[];
  flavors: Prisma.FlavorCreateManyInput[];
  flavorEmployments: Prisma.FlavorEmploymentCreateManyInput[];
  flavorBullets: Prisma.FlavorBulletCreateManyInput[];
  flavorLabels: Prisma.FlavorLabelCreateManyInput[];
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
  const employmentIds = new Map<string, string>();
  const bulletIds = new Map<string, string>();

  for (const row of proposal.employments) {
    const id = newId();
    employmentIds.set(row.key, id);
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
      bulletIds.set(bullet.key, bulletId);
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

  const labels: Prisma.ProfileLabelCreateManyInput[] = [];
  const labelIds = new Map<string, string>();
  const seenLabels = new Map<string, string>();
  for (const row of proposal.labels) {
    const dedupe = `${row.kind}\0${row.name}`;
    let labelId = seenLabels.get(dedupe);
    if (!labelId) {
      labelId = newId();
      seenLabels.set(dedupe, labelId);
      labels.push({ id: labelId, userId, kind: row.kind, name: row.name });
    }
    labelIds.set(row.key, labelId);
  }

  const flavors: Prisma.FlavorCreateManyInput[] = [];
  const flavorEmployments: Prisma.FlavorEmploymentCreateManyInput[] = [];
  const flavorBullets: Prisma.FlavorBulletCreateManyInput[] = [];
  const flavorLabels: Prisma.FlavorLabelCreateManyInput[] = [];
  for (const flavor of proposal.flavors) {
    const id = newId();
    flavors.push({ id, userId, name: flavor.name });
    linkIds(flavor.employmentKeys, employmentIds, (employmentId) => flavorEmployments.push({ flavorId: id, employmentId }));
    linkIds(flavor.bulletKeys, bulletIds, (bulletId) => flavorBullets.push({ flavorId: id, bulletId }));
    linkIds(flavor.labelKeys, labelIds, (labelId) => flavorLabels.push({ flavorId: id, labelId }));
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
    labels,
    flavors,
    flavorEmployments,
    flavorBullets,
    flavorLabels,
  };
}

function linkIds(keys: readonly string[], ids: ReadonlyMap<string, string>, push: (id: string) => void) {
  const seen = new Set<string>();
  for (const key of keys) {
    const id = ids.get(key);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    push(id);
  }
}
