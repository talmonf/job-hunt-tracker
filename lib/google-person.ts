import { isGoogleResourceName, isLinkedInUrl } from "./entity-links";
import { bilingualNameFromGoogle, type BilingualName, type GoogleNameFields } from "./person-name";

export type GooglePerson = BilingualName & {
  resourceName: string;
  displayName: string;
  givenName: string;
  familyName: string;
  title: string;
  workplace: string;
  linkedinUrl: string;
  emails: string[];
  phones: string[];
};

export type GooglePersonPayload = {
  resourceName?: string;
  names?: GoogleNameFields[];
  organizations?: { title?: string; name?: string; current?: boolean }[];
  occupations?: { value?: string }[];
  urls?: { value?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string; canonicalForm?: string }[];
};

export function normalizeGooglePerson(person: GooglePersonPayload): GooglePerson | null {
  const resourceName = person.resourceName?.trim() ?? "";
  if (!isGoogleResourceName(resourceName)) return null;
  const name = primaryGoogleName(person.names);
  const givenName = name?.givenName?.trim() ?? "";
  const familyName = name?.familyName?.trim() ?? "";
  const bilingual = bilingualNameFromGoogle(person.names);
  const displayName = (
    name?.displayName ||
    name?.unstructuredName ||
    [givenName, familyName].filter(Boolean).join(" ") ||
    [bilingual.firstName, bilingual.lastName].filter(Boolean).join(" ") ||
    [bilingual.firstNameHe, bilingual.lastNameHe].filter(Boolean).join(" ")
  ).trim();
  if (!displayName) return null;
  const org = person.organizations?.find((item) => item.current) ?? person.organizations?.[0];
  const title = (org?.title || person.occupations?.[0]?.value || "").trim();
  const workplace = (org?.name || "").trim();
  const linkedinUrl = (person.urls ?? []).map((item) => item.value?.trim() ?? "").find((value) => isLinkedInUrl(value)) ?? "";
  return {
    resourceName,
    displayName,
    givenName,
    familyName,
    ...bilingual,
    title,
    workplace,
    linkedinUrl,
    emails: uniqueValues((person.emailAddresses ?? []).map((item) => item.value)),
    phones: uniqueValues((person.phoneNumbers ?? []).map((item) => item.canonicalForm || item.value)),
  };
}

function primaryGoogleName(names: GoogleNameFields[] | undefined): GoogleNameFields | undefined {
  if (!names?.length) return undefined;
  return names.find((item) => item.metadata?.primary) ?? names[0];
}

function uniqueValues(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw?.trim() ?? "";
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
