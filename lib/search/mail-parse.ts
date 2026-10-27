import { htmlToText } from "./parse";

export const DEFAULT_SENDERS = [
  "jobalerts-noreply@linkedin.com",
  "jobs-noreply@linkedin.com",
  "alljobs.co.il",
  "drushim.co.il",
];

export const DEFAULT_CONFIRM = [
  "we got your application",
  "we received your application",
  "thank you for applying",
  "thank you for your application",
  "thanks for applying",
  "your application was sent",
  "קיבלנו את מועמדותך",
  "תודה על הגשת המועמדות",
];

export const DEFAULT_REJECT = [
  "decided not to move forward",
  "not to move forward",
  "not moving forward",
  "other candidates",
  "החלטנו שלא להמשיך",
  "מועמדים אחרים",
];

export type AlertJob = {
  company: string;
  title: string;
  location: string;
  url: string;
  externalId: string;
  israelAssumed: boolean;
};

export type ReplyKind = "applied" | "rejected";

export function linesOrDefault(value: string, fallback: readonly string[]): string[] {
  const lines = value.split(/\n/).map((item) => item.trim()).filter(Boolean);
  return lines.length ? lines : [...fallback];
}

export function classifyReply(text: string, confirm: readonly string[], reject: readonly string[]): ReplyKind | null {
  const haystack = text.toLowerCase();
  if (reject.some((phrase) => phrase.trim() && haystack.includes(phrase.trim().toLowerCase()))) return "rejected";
  if (confirm.some((phrase) => phrase.trim() && haystack.includes(phrase.trim().toLowerCase()))) return "applied";
  return null;
}

export function extractReplyTarget(subject: string, body: string): { company: string; title: string } {
  const source = `${subject}\n${body}`.replace(/^(fwd|fw)\s*:\s*/i, "");
  const patterns = [
    /(?:applying|application) for (?:the )?(?:position of |role of )?(?<title>.+?) at (?<company>[^\n,.]{2,80})/i,
    /application (?:for|to) (?<title>.+?) (?:at|with) (?<company>[^\n,.]{2,80})/i,
    /your application to (?<company>[^\n,.]{2,80})/i,
    /מועמדותך למשרת (?<title>.+?) ב(?<company>[^\n,.]{2,80})/,
    /למשרת (?<title>.+?) ב(?<company>[^\n,.]{2,80})/,
    /קיבלנו את מועמדותך(?: למשרת)? (?<title>.+?) ב(?<company>[^\n,.]{2,80})/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match?.groups) continue;
    return {
      company: (match.groups.company ?? "").trim(),
      title: (match.groups.title ?? "").trim(),
    };
  }
  return { company: "", title: "" };
}

function decodeHref(href: string): string {
  try {
    return decodeURIComponent(href.replace(/&amp;/g, "&"));
  } catch {
    return href;
  }
}

function linkedInId(url: string): string | null {
  const match = url.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/i);
  return match ? `linkedin:${match[1]}` : null;
}

export function parseAlertHtml(input: { from: string; html: string }): AlertJob[] {
  const from = input.from.toLowerCase();
  const israelAssumed = from.includes("alljobs") || from.includes("drushim") || from.includes("alljob");
  const html = input.html;
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const jobs: AlertJob[] = [];
  const seen = new Set<string>();
  for (const anchor of anchors) {
    const url = decodeHref(anchor[1] ?? "");
    const title = htmlToText(anchor[2] ?? "").replace(/\s+/g, " ").trim();
    const id = linkedInId(url)
      ?? (url.match(/alljobs\.co\.il\/.*JobID=(\d+)/i)?.[1] ? `alljobs:${url.match(/JobID=(\d+)/i)?.[1]}` : null)
      ?? (url.match(/drushim\.co\.il\/.*\/(\d+)/i)?.[1] ? `drushim:${url.match(/drushim\.co\.il\/.*\/(\d+)/i)?.[1]}` : null);
    if (!id || !title || title.length < 2 || seen.has(id)) continue;
    seen.add(id);
    const after = htmlToText(html.slice(anchor.index ?? 0, (anchor.index ?? 0) + 500));
    const lines = after.split("\n").map((line) => line.trim()).filter(Boolean);
    const company = lines.find((line) => line !== title && line.length < 80) ?? "";
    jobs.push({
      company,
      title,
      location: "",
      url: url.split("?")[0],
      externalId: id,
      israelAssumed,
    });
  }
  return jobs;
}

export type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
};

export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function gmailBodies(part: GmailPart | undefined): { text: string; html: string } {
  const found = { text: "", html: "" };
  const walk = (node: GmailPart | undefined) => {
    if (!node) return;
    const data = node.body?.data ? decodeBase64Url(node.body.data) : "";
    if (node.mimeType === "text/plain" && data && !found.text) found.text = data;
    if (node.mimeType === "text/html" && data && !found.html) found.html = data;
    for (const child of node.parts ?? []) walk(child);
  };
  walk(part);
  return found;
}

export function headerValue(headers: { name: string; value: string }[] | undefined, name: string): string {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}
