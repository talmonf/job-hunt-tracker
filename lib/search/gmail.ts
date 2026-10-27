import { decryptSecret } from "../crypto";
import { googleAccessToken } from "../calendar";
import { gmailBodies, headerValue, type GmailPart } from "./mail-parse";

type Listed = { id: string };

export async function gmailAccess(refreshToken: string): Promise<string | null> {
  return googleAccessToken(decryptSecret(refreshToken));
}

async function gmailGet(token: string, path: string): Promise<{ ok: true; json: unknown } | { ok: false; status: number }> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, json: await response.json() };
}

export async function listMessageIds(token: string, query: string): Promise<{ ids: string[] } | { error: string }> {
  const result = await gmailGet(token, `messages?maxResults=20&q=${encodeURIComponent(query)}`);
  if (!result.ok) return { error: result.status === 403 ? "scope" : `HTTP ${result.status}` };
  const body = result.json as { messages?: Listed[] };
  return { ids: (body.messages ?? []).map((message) => message.id).filter(Boolean) };
}

export type GmailMessage = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date | null;
  text: string;
  html: string;
};

export async function readMessage(token: string, id: string): Promise<GmailMessage | null> {
  const result = await gmailGet(token, `messages/${encodeURIComponent(id)}?format=full`);
  if (!result.ok) return null;
  const body = result.json as { snippet?: string; payload?: GmailPart & { headers?: { name: string; value: string }[] } };
  const headers = body.payload?.headers;
  const bodies = gmailBodies(body.payload);
  const rawDate = headerValue(headers, "date");
  const date = rawDate ? new Date(rawDate) : null;
  return {
    id,
    from: headerValue(headers, "from"),
    subject: headerValue(headers, "subject"),
    snippet: body.snippet ?? "",
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    text: bodies.text,
    html: bodies.html,
  };
}
