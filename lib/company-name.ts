export const COMPANY_KINDS = ["tracked", "own"] as const;

export const COMPANY_STAGES = ["idea", "forming", "running", "paused"] as const;

export const RELATIONSHIP_MAX = 80;

export type CompanyKindName = (typeof COMPANY_KINDS)[number];

export type CompanyStageName = (typeof COMPANY_STAGES)[number];

export function isCompanyStage(value: string): value is CompanyStageName {
  return (COMPANY_STAGES as readonly string[]).includes(value);
}

export function companyNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** First spelling wins. Blank names and case-only repeats are dropped. */
export function distinctCompanyNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = companyNameKey(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function sameCompanyName(a: string, b: string): boolean {
  const key = companyNameKey(a);
  return key !== "" && key === companyNameKey(b);
}

export type NamedCompany = {
  name: string;
  startedOn: string;
  startedUnknown: boolean;
  endedOn: string;
  endedUnknown: boolean;
  relationship?: string;
};

/** A contact's workplace is one of their companies. A name that is not listed yet is added. */
export function withWorkplaceCompany(
  links: readonly NamedCompany[],
  workplace: string,
): Array<NamedCompany & { relationship: string }> {
  const name = workplace.trim();
  const normalized = links.map((link) => ({ ...link, relationship: link.relationship ?? "" }));
  if (!name || normalized.some((link) => sameCompanyName(link.name, name))) return normalized;
  return [{ name, startedOn: "", startedUnknown: false, endedOn: "", endedUnknown: false, relationship: "" }, ...normalized];
}

/** Keep an explicit match. Otherwise prefer a company they still work at, then the first listed. */
export function defaultWorkplaceName(
  workplace: string,
  companies: readonly { name: string; current?: boolean }[],
): string {
  const match = companies.find((company) => sameCompanyName(company.name, workplace));
  if (match) return match.name;
  return companies.find((company) => company.current)?.name ?? companies[0]?.name ?? "";
}
