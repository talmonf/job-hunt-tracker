export type OutputLanguage = "en" | "he" | "both";

export type ProposedBullet = { key: string; textEn: string; textHe: string };

export type ProposedEmployment = {
  key: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: ProposedBullet[];
  createNote: boolean;
};

export type ProposedEducation = {
  key: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
};

export type ProposedVolunteer = {
  key: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  textEn: string;
  textHe: string;
};

export type ProposedCertificate = {
  key: string;
  name: string;
  issuer: string;
  issuedOn: string;
  url: string;
};

export type ProposedConflict = { field: string; values: string[] };

export type Proposal = {
  headline: string;
  aboutEn: string;
  aboutHe: string;
  employments: ProposedEmployment[];
  educations: ProposedEducation[];
  volunteers: ProposedVolunteer[];
  certificates: ProposedCertificate[];
  skills: string[];
  conflicts: ProposedConflict[];
  usedModel: boolean;
};

export function emptyProposal(): Proposal {
  return {
    headline: "",
    aboutEn: "",
    aboutHe: "",
    employments: [],
    educations: [],
    volunteers: [],
    certificates: [],
    skills: [],
    conflicts: [],
    usedModel: false,
  };
}

export function isOutputLanguage(value: string): value is OutputLanguage {
  return value === "en" || value === "he" || value === "both";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dateText(value: unknown): string {
  const raw = text(value);
  const monthYear = /^(\d{1,2})\/(\d{4})$/.exec(raw);
  if (monthYear) {
    const month = Number(monthYear[1]);
    if (month < 1 || month > 12) return "";
    return `${String(month).padStart(2, "0")}/${monthYear[2]}`;
  }
  if (/^\d{4}$/.test(raw)) return raw;
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(raw);
  if (!iso) return "";
  const month = Number(iso[2]);
  if (month < 1 || month > 12) return "";
  return `${iso[2]}/${iso[1]}`;
}

function flag(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

export function normalizeProposal(raw: unknown, usedModel = false): Proposal {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const proposal = emptyProposal();
  proposal.headline = text(source.headline);
  proposal.aboutEn = text(source.aboutEn);
  proposal.aboutHe = text(source.aboutHe);
  proposal.usedModel = usedModel || source.usedModel === true;
  proposal.employments = list(source.employments).map((row, index) => {
    const item = record(row);
    const key = text(item.key) || `e${index + 1}`;
    return {
      key,
      title: text(item.title),
      company: text(item.company),
      startDate: dateText(item.startDate),
      endDate: dateText(item.endDate),
      isCurrent: flag(item.isCurrent),
      createNote: item.createNote === undefined ? true : flag(item.createNote),
      bullets: list(item.bullets)
        .map((bullet, bulletIndex) => {
          const point = record(bullet);
          return {
            key: text(point.key) || `${key}b${bulletIndex + 1}`,
            textEn: text(point.textEn),
            textHe: text(point.textHe),
          };
        })
        .filter((bullet) => bullet.textEn || bullet.textHe),
    };
  }).filter((row) => row.title || row.company);
  proposal.educations = list(source.educations).map((row, index) => {
    const item = record(row);
    return {
      key: text(item.key) || `ed${index + 1}`,
      school: text(item.school),
      degree: text(item.degree),
      field: text(item.field),
      startDate: dateText(item.startDate),
      endDate: dateText(item.endDate),
    };
  }).filter((row) => row.school);
  proposal.volunteers = list(source.volunteers).map((row, index) => {
    const item = record(row);
    return {
      key: text(item.key) || `v${index + 1}`,
      organization: text(item.organization),
      role: text(item.role),
      startDate: dateText(item.startDate),
      endDate: dateText(item.endDate),
      textEn: text(item.textEn),
      textHe: text(item.textHe),
    };
  }).filter((row) => row.organization);
  proposal.certificates = list(source.certificates).map((row, index) => {
    const item = record(row);
    return {
      key: text(item.key) || `c${index + 1}`,
      name: text(item.name),
      issuer: text(item.issuer),
      issuedOn: dateText(item.issuedOn),
      url: text(item.url),
    };
  }).filter((row) => row.name);
  proposal.skills = skillNames(source);
  proposal.conflicts = list(source.conflicts).map((row) => {
    const item = record(row);
    return { field: text(item.field), values: textList(item.values) };
  }).filter((row) => row.field && row.values.length > 1);
  return proposal;
}

export function containsHebrew(value: string): boolean {
  return /[\u0590-\u05FF]/.test(value);
}

export function containsLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

export function proposalText(proposal: Proposal): string {
  return [
    proposal.headline,
    proposal.aboutEn,
    proposal.aboutHe,
    ...proposal.employments.flatMap((row) => [row.title, row.company, ...row.bullets.flatMap((bullet) => [bullet.textEn, bullet.textHe])]),
  ].join("\n");
}

export function needsModel(proposal: Proposal, language: OutputLanguage, fileCount: number): boolean {
  if (fileCount > 1) return true;
  const hasHistory = proposal.employments.length > 0 || proposal.educations.length > 0;
  if (!hasHistory) return true;
  const body = proposalText(proposal);
  const hasHe = containsHebrew(body);
  const hasEn = containsLatin(body);
  if (language === "he" && !hasHe) return true;
  if (language === "en" && !hasEn) return true;
  if (language === "both" && (!hasHe || !hasEn)) return true;
  return false;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function uniqueSkillNames(names: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** Skills from the parser, or skill names on an older draft. Themes and flavors are ignored. */
function skillNames(source: Record<string, unknown>): string[] {
  if ("skills" in source) return uniqueSkillNames(textList(source.skills));
  return uniqueSkillNames(
    list(source.labels).flatMap((row) => {
      const item = record(row);
      if (item.kind === "theme") return [];
      const name = text(item.name);
      return name ? [name] : [];
    }),
  );
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean);
}

export function readProposalForm(formData: FormData): Proposal {
  const proposal = emptyProposal();
  proposal.headline = text(formData.get("headline"));
  proposal.aboutEn = text(formData.get("aboutEn"));
  proposal.aboutHe = text(formData.get("aboutHe"));
  proposal.usedModel = formData.get("usedModel") === "1";
  const empCount = count(formData, "empCount");
  for (let index = 0; index < empCount; index += 1) {
    const key = text(formData.get(`emp_${index}_key`)) || `e${index + 1}`;
    const title = text(formData.get(`emp_${index}_title`));
    const company = text(formData.get(`emp_${index}_company`));
    const bulletCount = count(formData, `emp_${index}_bulletCount`);
    const bullets: ProposedBullet[] = [];
    for (let bulletIndex = 0; bulletIndex < bulletCount; bulletIndex += 1) {
      const textEn = text(formData.get(`emp_${index}_b_${bulletIndex}_en`));
      const textHe = text(formData.get(`emp_${index}_b_${bulletIndex}_he`));
      if (!textEn && !textHe) continue;
      bullets.push({
        key: text(formData.get(`emp_${index}_b_${bulletIndex}_key`)) || `${key}b${bulletIndex + 1}`,
        textEn,
        textHe,
      });
    }
    if (!title && !company && bullets.length === 0) continue;
    proposal.employments.push({
      key,
      title,
      company,
      startDate: dateText(formData.get(`emp_${index}_start`)),
      endDate: dateText(formData.get(`emp_${index}_end`)),
      isCurrent: formData.get(`emp_${index}_current`) === "1",
      createNote: formData.get(`emp_${index}_note`) === "1",
      bullets,
    });
  }
  const eduCount = count(formData, "eduCount");
  for (let index = 0; index < eduCount; index += 1) {
    const school = text(formData.get(`edu_${index}_school`));
    if (!school) continue;
    proposal.educations.push({
      key: text(formData.get(`edu_${index}_key`)) || `ed${index + 1}`,
      school,
      degree: text(formData.get(`edu_${index}_degree`)),
      field: text(formData.get(`edu_${index}_field`)),
      startDate: dateText(formData.get(`edu_${index}_start`)),
      endDate: dateText(formData.get(`edu_${index}_end`)),
    });
  }
  const volCount = count(formData, "volCount");
  for (let index = 0; index < volCount; index += 1) {
    const organization = text(formData.get(`vol_${index}_organization`));
    if (!organization) continue;
    proposal.volunteers.push({
      key: text(formData.get(`vol_${index}_key`)) || `v${index + 1}`,
      organization,
      role: text(formData.get(`vol_${index}_role`)),
      startDate: dateText(formData.get(`vol_${index}_start`)),
      endDate: dateText(formData.get(`vol_${index}_end`)),
      textEn: text(formData.get(`vol_${index}_en`)),
      textHe: text(formData.get(`vol_${index}_he`)),
    });
  }
  const certCount = count(formData, "certCount");
  for (let index = 0; index < certCount; index += 1) {
    const name = text(formData.get(`cert_${index}_name`));
    if (!name) continue;
    proposal.certificates.push({
      key: text(formData.get(`cert_${index}_key`)) || `c${index + 1}`,
      name,
      issuer: text(formData.get(`cert_${index}_issuer`)),
      issuedOn: dateText(formData.get(`cert_${index}_issued`)),
      url: text(formData.get(`cert_${index}_url`)),
    });
  }
  const skillCount = count(formData, "skillCount");
  const skills: string[] = [];
  for (let index = 0; index < skillCount; index += 1) {
    const name = text(formData.get(`skill_${index}_name`));
    if (name) skills.push(name);
  }
  proposal.skills = uniqueSkillNames(skills);
  const conflictCount = count(formData, "conflictCount");
  for (let index = 0; index < conflictCount; index += 1) {
    const field = text(formData.get(`conflict_${index}_field`));
    const values = text(formData.get(`conflict_${index}_values`)).split("\n").map((line) => line.trim()).filter(Boolean);
    if (field && values.length > 1) proposal.conflicts.push({ field, values });
  }
  return proposal;
}

function count(formData: FormData, name: string): number {
  const parsed = Number(formData.get(name));
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 80) return 0;
  return parsed;
}
