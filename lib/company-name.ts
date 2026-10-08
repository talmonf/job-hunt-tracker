export function companyNameKey(name: string): string {
  return name.trim().toLowerCase();
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
};

/** A contact's workplace is one of their companies. A name that is not listed yet is added. */
export function withWorkplaceCompany(links: readonly NamedCompany[], workplace: string): NamedCompany[] {
  const name = workplace.trim();
  if (!name || links.some((link) => sameCompanyName(link.name, name))) return [...links];
  return [{ name, startedOn: "", startedUnknown: false, endedOn: "", endedUnknown: false }, ...links];
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
