import type { ChipLink } from "@/lib/entity-links";
import { mentionToChip, parseTextParts, type MentionToken } from "@/lib/mentions";
import { ContactChip } from "./contact-chip";

export type MentionLookup = {
  contacts?: { id: string; fullName: string; role: string; googleResourceName?: string | null; linkedinUrl?: string }[];
  links?: ChipLink[];
};

export function MentionText({
  text,
  hide,
  lookup,
}: {
  text: string;
  hide: boolean;
  lookup?: MentionLookup;
}) {
  if (!text.trim()) return null;
  const parts = parseTextParts(text);
  return (
    <div className="whitespace-pre-wrap break-words text-sm text-slate-200">
      {parts.map((part, index) => {
        if (part.type === "text") return <span key={index}>{part.value}</span>;
        if (part.type === "url") {
          return (
            <a key={index} className="text-sky-300 underline" href={part.url} target="_blank" rel="noreferrer">
              {part.url}
            </a>
          );
        }
        return <ContactChip key={index} link={resolveMention(part.token, lookup)} hide={hide} />;
      })}
    </div>
  );
}

function resolveMention(token: MentionToken, lookup?: MentionLookup): ChipLink {
  const chip = mentionToChip(token);
  const target = token.target;
  if (target.kind === "local_contact") {
    const contact = lookup?.contacts?.find((item) => item.id === target.contactId);
    if (contact) {
      return {
        ...chip,
        displayName: contact.fullName || chip.displayName,
        title: contact.role,
        googleResourceName: contact.googleResourceName,
        url: contact.linkedinUrl,
        contactId: contact.id,
      };
    }
  }
  if (target.kind === "google_contact") {
    const resourceName = target.googleResourceName;
    const link = lookup?.links?.find((item) => item.googleResourceName === resourceName);
    const contact = lookup?.contacts?.find((item) => item.googleResourceName === resourceName);
    if (contact) {
      return {
        ...chip,
        displayName: contact.fullName || chip.displayName,
        title: contact.role || link?.title || chip.title,
        contactId: contact.id,
        googleResourceName: contact.googleResourceName,
      };
    }
    if (link) return { ...chip, ...link, kind: chip.kind, displayName: chip.displayName || link.displayName };
  }
  if (target.kind === "linkedin" || target.kind === "url") {
    const url = target.url;
    const link = lookup?.links?.find((item) => item.url === url);
    if (link) return { ...chip, title: link.title || chip.title, displayName: chip.displayName || link.displayName };
  }
  return chip;
}
