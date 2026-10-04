import { EMPLOYMENT_TYPES, ENGAGEMENTS, WORK_ARRANGEMENTS } from "../events";

export const JOB_DESCRIPTION_CLIP = 20_000;
export const PROPOSED_TAG_CAP = 20;

export type JobDetailFields = {
  companyName: string;
  title: string;
  location: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number] | "";
  workArrangement: (typeof WORK_ARRANGEMENTS)[number] | "";
  engagement: (typeof ENGAGEMENTS)[number] | "";
};

export type JobDetailTag = { id: string; name: string };

export type NormalizedJobDetails = {
  fields: JobDetailFields;
  tagIds: string[];
  proposedTags: string[];
};

export function jobDetailsSystem(catalogNames: string[]): string {
  const catalog = catalogNames.length ? catalogNames.join(", ") : "(none)";
  return `You extract job details from a posting the user pasted.
Return JSON only, with these keys:
companyName, title, location,
employmentType ("full_time" or "part_time"),
workArrangement ("on_site", "remote", "hybrid", or ""),
engagement ("employee" or "freelance"),
tagNames (array of strings).
Use "" for companyName, title, or location when the posting does not state it. Do not invent those.
Use "full_time" for employmentType when the posting does not state full-time or part-time.
Use "" for workArrangement when the posting does not state on-site, remote, or hybrid.
Use "employee" for engagement when the posting does not state freelance.
Prefer names from this existing tag catalog when they fit: ${catalog}.
You may propose new short tag names for skills, domains, or seniority that the posting clearly names and that are not in the catalog. At most ${PROPOSED_TAG_CAP} new names. Do not repeat a catalog name.`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  const raw = text(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

function nameKey(name: string): string {
  return name.toLocaleLowerCase();
}

export function normalizeJobDetails(raw: unknown, catalog: JobDetailTag[]): NormalizedJobDetails {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fields: JobDetailFields = {
    companyName: text(source.companyName),
    title: text(source.title),
    location: text(source.location),
    employmentType: oneOf(source.employmentType, EMPLOYMENT_TYPES) || "full_time",
    workArrangement: oneOf(source.workArrangement, WORK_ARRANGEMENTS),
    engagement: oneOf(source.engagement, ENGAGEMENTS) || "employee",
  };
  const byName = new Map(catalog.map((tag) => [nameKey(tag.name.trim()), tag]));
  const names = Array.isArray(source.tagNames) ? source.tagNames : [];
  const tagIds: string[] = [];
  const proposedTags: string[] = [];
  const seenIds = new Set<string>();
  const seenProposed = new Set<string>();
  for (const item of names) {
    const name = text(item);
    if (!name) continue;
    const match = byName.get(nameKey(name));
    if (match) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        tagIds.push(match.id);
      }
      continue;
    }
    const key = nameKey(name);
    if (seenProposed.has(key) || proposedTags.length >= PROPOSED_TAG_CAP) continue;
    seenProposed.add(key);
    proposedTags.push(name);
  }
  return { fields, tagIds, proposedTags };
}
