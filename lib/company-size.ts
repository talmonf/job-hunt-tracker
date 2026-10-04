export const COMPANY_SIZES = [
  "under_10",
  "between_10_30",
  "between_31_100",
  "between_101_200",
  "between_201_1000",
  "between_1001_5000",
  "over_5000",
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];

export function isCompanySize(value: string): value is CompanySize {
  return (COMPANY_SIZES as readonly string[]).includes(value);
}
