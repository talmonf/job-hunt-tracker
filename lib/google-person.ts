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
  mobile: string;
  email: string;
  address: string;
};

export type GooglePersonPayload = {
  resourceName?: string;
  names?: GoogleNameFields[];
  organizations?: { title?: string; name?: string; current?: boolean }[];
  occupations?: { value?: string }[];
  urls?: { value?: string }[];
  emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
  phoneNumbers?: {
    value?: string;
    canonicalForm?: string;
    type?: string;
    formattedType?: string;
    metadata?: { primary?: boolean };
  }[];
  addresses?: GoogleAddress[];
};

export type GoogleAddress = {
  formattedValue?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  metadata?: { primary?: boolean };
};

export function normalizeGooglePerson(person: GooglePersonPayload): GooglePerson | null {
  const resourceName = person.resourceName?.trim() ?? "";
  if (!isGoogleResourceName(resourceName)) return null;
  const name = primaryGoogleName(person.names);
  const givenName = name?.givenName?.trim() ?? "";
  const familyName = name?.familyName?.trim() ?? "";
  const bilingual = bilingualNameFromGoogle(person.names);
  const email = emailFrom(person.emailAddresses);
  const mobile = mobileFrom(person.phoneNumbers);
  const displayName = (
    name?.displayName ||
    name?.unstructuredName ||
    [givenName, familyName].filter(Boolean).join(" ") ||
    [bilingual.firstName, bilingual.lastName].filter(Boolean).join(" ") ||
    [bilingual.firstNameHe, bilingual.lastNameHe].filter(Boolean).join(" ") ||
    email ||
    mobile
  ).trim();
  if (!displayName) return null;
  const org = person.organizations?.find((item) => item.current) ?? person.organizations?.[0];
  const title = (org?.title || person.occupations?.[0]?.value || "").trim();
  const workplace = (org?.name || "").trim();
  return {
    resourceName,
    displayName,
    givenName,
    familyName,
    ...bilingual,
    title,
    workplace,
    linkedinUrl: linkedInUrlFrom(person.urls),
    mobile,
    email,
    address: addressFrom(person.addresses),
  };
}

function linkedInUrlFrom(urls: { value?: string }[] | undefined): string {
  for (const item of urls ?? []) {
    const value = item.value?.trim() ?? "";
    if (!value || !/linkedin\.com/i.test(value)) continue;
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
    if (isLinkedInUrl(candidate)) return candidate;
  }
  return "";
}

function emailFrom(emails: GooglePersonPayload["emailAddresses"]): string {
  const list = (emails ?? []).filter((item) => item.value?.trim());
  const chosen = list.find((item) => item.metadata?.primary) ?? list[0];
  return chosen?.value?.trim() ?? "";
}

function mobileFrom(phones: GooglePersonPayload["phoneNumbers"]): string {
  const usable = (phones ?? []).filter((item) => phoneText(item) && !isFax(item));
  const mobiles = usable.filter(isMobile);
  const pool = mobiles.length ? mobiles : usable.some((item) => phoneType(item)) ? [] : usable;
  const chosen = pool.find((item) => item.metadata?.primary) ?? pool[0];
  return chosen ? phoneText(chosen) : "";
}

function phoneText(phone: { value?: string; canonicalForm?: string }): string {
  return (phone.value || phone.canonicalForm || "").trim();
}

function phoneType(phone: { type?: string; formattedType?: string }): string {
  return `${phone.type ?? ""} ${phone.formattedType ?? ""}`.trim().toLowerCase();
}

function isMobile(phone: { type?: string; formattedType?: string }): boolean {
  const type = phoneType(phone);
  return type.includes("mobile") || type.includes("cell") || type.includes("נייד");
}

function isFax(phone: { type?: string; formattedType?: string }): boolean {
  const type = phoneType(phone);
  return type.includes("fax") || type.includes("פקס");
}

function addressFrom(addresses: GoogleAddress[] | undefined): string {
  if (!addresses?.length) return "";
  const chosen = addresses.find((item) => item.metadata?.primary) ?? addresses[0];
  return formatContactAddress(chosen);
}

export function formatContactAddress(address: GoogleAddress): string {
  const city = address.city?.trim() ?? "";
  const region = address.region?.trim() ?? "";
  const country = address.country?.trim() ?? "";
  const code = address.countryCode?.trim() ?? "";
  if (isIsrael(country) || isIsrael(code)) return city || cityFromFormatted(address.formattedValue);
  const countryLabel = country || (code ? code.toUpperCase() : "");
  if (city || region || countryLabel) return [city, region, countryLabel].filter(Boolean).join(", ");
  return (address.formattedValue ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

function cityFromFormatted(value: string | undefined): string {
  const parts = (value ?? "")
    .split(/\n+|,\s*/)
    .map((part) => part.trim())
    .filter((part) => part && !isIsrael(part));
  return parts.at(-1) ?? "";
}

function isIsrael(value: string): boolean {
  const key = value.trim().toLowerCase().replace(/\./g, "");
  return key === "il" || key === "isr" || key === "israel" || value.trim() === "ישראל";
}

function primaryGoogleName(names: GoogleNameFields[] | undefined): GoogleNameFields | undefined {
  if (!names?.length) return undefined;
  return names.find((item) => item.metadata?.primary) ?? names[0];
}
