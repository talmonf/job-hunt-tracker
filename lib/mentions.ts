import {
  googleContactsUrl,
  isGoogleResourceName,
  isHttpUrl,
  isLinkedInUrl,
  type ChipLink,
  type EntityLinkKind,
} from "./entity-links";

export type MentionTarget =
  | { kind: "local_contact"; contactId: string }
  | { kind: "google_contact"; googleResourceName: string }
  | { kind: "linkedin" | "url"; url: string };

export type MentionToken = {
  displayName: string;
  target: MentionTarget;
};

export type TextPart =
  | { type: "text"; value: string }
  | { type: "mention"; token: MentionToken }
  | { type: "url"; url: string };

const TOKEN_RE = /\[\[([^[\]]+?)\|([^[\]]+?)\]\]/g;
const URL_RE = /https?:\/\/[^\s<>"'`)\]]+/gi;

export function mentionToken(displayName: string, target: MentionTarget): string {
  const name = displayName.replace(/[\[\]|]/g, "").trim() || "link";
  return `[[${name}|${serializeTarget(target)}]]`;
}

export function serializeTarget(target: MentionTarget): string {
  if (target.kind === "local_contact") return `contact:${target.contactId}`;
  if (target.kind === "google_contact") return `google:${target.googleResourceName}`;
  return target.url;
}

export function parseTarget(raw: string): MentionTarget | null {
  const value = raw.trim();
  if (value.startsWith("contact:")) {
    const contactId = value.slice("contact:".length).trim();
    return contactId ? { kind: "local_contact", contactId } : null;
  }
  if (value.startsWith("google:")) {
    const googleResourceName = value.slice("google:".length).trim();
    return isGoogleResourceName(googleResourceName) ? { kind: "google_contact", googleResourceName } : null;
  }
  if (!isHttpUrl(value)) return null;
  return { kind: isLinkedInUrl(value) ? "linkedin" : "url", url: value };
}

export function parseMentionToken(raw: string): MentionToken | null {
  const match = raw.match(/^\[\[([^[\]]+?)\|([^[\]]+?)\]\]$/);
  if (!match) return null;
  const target = parseTarget(match[2]);
  if (!target) return null;
  return { displayName: match[1].trim(), target };
}

export function parseTextParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const tokenRe = new RegExp(TOKEN_RE.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text))) {
    if (match.index > cursor) pushPlain(parts, text.slice(cursor, match.index));
    const token = parseMentionToken(match[0]);
    if (token) parts.push({ type: "mention", token });
    else pushPlain(parts, match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) pushPlain(parts, text.slice(cursor));
  return parts;
}

function pushPlain(parts: TextPart[], text: string) {
  const urlRe = new RegExp(URL_RE.source, "gi");
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text))) {
    if (match.index > cursor) parts.push({ type: "text", value: text.slice(cursor, match.index) });
    const url = match[0].replace(/[.,;:!?]+$/, "");
    if (isHttpUrl(url)) {
      parts.push({ type: "url", url });
      cursor = match.index + url.length;
      urlRe.lastIndex = cursor;
    } else {
      parts.push({ type: "text", value: match[0] });
      cursor = match.index + match[0].length;
    }
  }
  if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
}

export function mentionToChip(token: MentionToken, extras?: Partial<ChipLink>): ChipLink {
  return {
    id: extras?.id,
    kind: token.target.kind,
    displayName: extras?.displayName ?? token.displayName,
    title: extras?.title ?? "",
    googleResourceName:
      token.target.kind === "google_contact" ? token.target.googleResourceName : extras?.googleResourceName,
    url: token.target.kind === "linkedin" || token.target.kind === "url" ? token.target.url : extras?.url,
    contactId: token.target.kind === "local_contact" ? token.target.contactId : extras?.contactId,
  };
}

export function chipToMention(link: ChipLink): string | null {
  const target = chipToTarget(link);
  if (!target) return null;
  return mentionToken(link.displayName, target);
}

export function chipToTarget(link: ChipLink): MentionTarget | null {
  if (link.kind === "local_contact" && link.contactId) {
    return { kind: "local_contact", contactId: link.contactId };
  }
  if (link.kind === "google_contact" && link.googleResourceName) {
    return { kind: "google_contact", googleResourceName: link.googleResourceName };
  }
  if ((link.kind === "linkedin" || link.kind === "url") && link.url && isHttpUrl(link.url)) {
    return { kind: link.kind, url: link.url };
  }
  return null;
}

export function mentionHref(token: MentionToken): string {
  if (token.target.kind === "local_contact") return `/contacts/${token.target.contactId}`;
  if (token.target.kind === "google_contact") return googleContactsUrl(token.target.googleResourceName);
  return token.target.url;
}

export function mentionKind(token: MentionToken): EntityLinkKind {
  return token.target.kind;
}
