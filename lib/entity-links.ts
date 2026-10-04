export const ENTITY_LINK_KINDS = ["google_contact", "linkedin", "url", "local_contact", "manual"] as const;
export type EntityLinkKind = (typeof ENTITY_LINK_KINDS)[number];

export type ChipLink = {
  id?: string;
  kind: EntityLinkKind;
  displayName: string;
  title: string;
  googleResourceName?: string | null;
  url?: string;
  contactId?: string | null;
};

const HTTP_URL = /^https?:\/\/[^\s<>"'`]+$/i;
const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i;

export function isEntityLinkKind(value: string): value is EntityLinkKind {
  return (ENTITY_LINK_KINDS as readonly string[]).includes(value);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLinkedInUrl(value: string): boolean {
  if (!isHttpUrl(value)) return false;
  try {
    return LINKEDIN_HOST.test(new URL(value.trim()).hostname);
  } catch {
    return false;
  }
}

export function kindFromUrl(value: string): "linkedin" | "url" | null {
  if (!isHttpUrl(value)) return null;
  return isLinkedInUrl(value) ? "linkedin" : "url";
}

export function googlePersonId(resourceName: string): string {
  return resourceName.trim().replace(/^(?:people|otherContacts)\//, "");
}

export function googleContactsUrl(resourceName: string): string {
  const id = googlePersonId(resourceName);
  return id ? `https://contacts.google.com/person/${id}` : "";
}

export function isGoogleResourceName(value: string): boolean {
  return /^(?:people|otherContacts)\/[A-Za-z0-9._~-]+$/.test(value.trim());
}

export function chipHref(link: ChipLink): string {
  if (link.contactId) return `/contacts/${link.contactId}`;
  if (link.kind === "google_contact" && link.googleResourceName) {
    return googleContactsUrl(link.googleResourceName);
  }
  if (link.url && isHttpUrl(link.url)) return link.url;
  return "";
}

export function chipOpensInApp(link: ChipLink): boolean {
  return Boolean(link.contactId);
}

export function labelFromUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    const path = url.pathname.replace(/\/+$/, "");
    const last = path.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last.replace(/-/g, " ")) : url.hostname;
  } catch {
    return value.trim();
  }
}

export function looksLikeHttpUrl(value: string): boolean {
  return HTTP_URL.test(value.trim());
}

export type LinkIdentity = {
  contactId?: string | null;
  googleResourceName?: string | null;
  url?: string | null;
};

export type LinkIdentityFilter =
  | { contactId: string }
  | { googleResourceName: string }
  | { url: string };

export function linkIdentityFilters(identity: LinkIdentity): LinkIdentityFilter[] {
  const filters: LinkIdentityFilter[] = [];
  const contactId = identity.contactId?.trim();
  if (contactId) filters.push({ contactId });
  const resource = identity.googleResourceName?.trim();
  if (resource) filters.push({ googleResourceName: resource });
  const url = identity.url?.trim();
  if (url) filters.push({ url });
  return filters;
}

export function sameLinkIdentity(a: LinkIdentity, b: LinkIdentity): boolean {
  const right = linkIdentityFilters(b);
  return linkIdentityFilters(a).some((filter) =>
    right.some((other) => {
      if ("contactId" in filter && "contactId" in other) return filter.contactId === other.contactId;
      if ("googleResourceName" in filter && "googleResourceName" in other) {
        return filter.googleResourceName === other.googleResourceName;
      }
      if ("url" in filter && "url" in other) return filter.url === other.url;
      return false;
    }),
  );
}

export function toChipLink(link: {
  id: string;
  kind: EntityLinkKind;
  displayName: string;
  title: string;
  googleResourceName?: string | null;
  url: string;
  contactId?: string | null;
}): ChipLink {
  return {
    id: link.id,
    kind: link.kind,
    displayName: link.displayName,
    title: link.title,
    googleResourceName: link.googleResourceName,
    url: link.url,
    contactId: link.contactId,
  };
}
