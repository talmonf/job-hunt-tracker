import { createHash } from "crypto";
import { decryptSecret } from "./crypto";
import { googleRefresh } from "./calendar";
import { isGoogleResourceName } from "./entity-links";
import { normalizeGooglePerson, type GooglePerson, type GooglePersonPayload } from "./google-person";

const CONTACT_READ_MASK = "names,organizations,occupations,urls,emailAddresses,phoneNumbers,addresses";
const OTHER_READ_MASK = "names,emailAddresses,phoneNumbers";
const DIRECTORY_TTL_MS = 2 * 60 * 1000;
const DIRECTORY_PAGES = 3;

export type { GooglePerson };

export type GoogleContactsError = "config" | "refresh" | "scope" | "api" | "google";

export type GooglePeopleSearch = {
  people: GooglePerson[];
  error?: GoogleContactsError;
};

type GoogleErrorBody = {
  error?: {
    status?: string;
    message?: string;
    details?: { reason?: string }[];
  };
};

type PeopleSearchResponse = {
  results?: { person?: GooglePersonPayload }[];
};

type PeopleListResponse = {
  connections?: GooglePersonPayload[];
  otherContacts?: GooglePersonPayload[];
  nextPageToken?: string;
};

type EndpointHit = {
  ok: boolean;
  people: GooglePerson[];
  error?: GoogleContactsError;
};

type Directory = { ok: boolean; people: GooglePerson[]; error?: GoogleContactsError };

const directoryLoads = new Map<string, { expires: number; pending: Promise<Directory> }>();

export async function contactsAccessToken(encryptedRefresh: string): Promise<{ accessToken: string | null; error?: "config" | "refresh" }> {
  try {
    return await googleRefresh(decryptSecret(encryptedRefresh));
  } catch {
    return { accessToken: null, error: "refresh" };
  }
}

export function classifyGoogleError(status: number, body: GoogleErrorBody | null): GoogleContactsError {
  const reason = body?.error?.details?.find((item) => item.reason)?.reason ?? "";
  const text = `${status} ${body?.error?.status ?? ""} ${reason} ${body?.error?.message ?? ""}`.toLowerCase();
  if (text.includes("insufficient") || reason.toLowerCase().includes("scope")) return "scope";
  if (
    text.includes("service_disabled") ||
    text.includes("accessnotconfigured") ||
    text.includes("has not been used") ||
    text.includes("is disabled")
  ) {
    return "api";
  }
  if (status === 401 || text.includes("unauthenticated") || text.includes("invalid_grant")) return "refresh";
  return "google";
}

export function peopleFromSearch(json: PeopleSearchResponse): GooglePerson[] {
  return (json.results ?? [])
    .map((row) => normalizeGooglePerson(row.person ?? {}))
    .filter((person): person is GooglePerson => Boolean(person));
}

export function mergeGooglePeople(people: GooglePerson[]): GooglePerson[] {
  const merged = new Map<string, GooglePerson>();
  for (const person of people) {
    if (!merged.has(person.resourceName)) merged.set(person.resourceName, person);
  }
  return [...merged.values()];
}

export function matchGooglePeople(people: GooglePerson[], query: string): GooglePerson[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return people.filter((person) => personSearchText(person).includes(q));
}

export async function searchGooglePeople(accessToken: string, query: string): Promise<GooglePeopleSearch> {
  const q = query.trim();
  if (!q) return { people: [] };
  const scopeError = await missingContactsScope(accessToken);
  if (scopeError) return { people: [], error: "scope" };
  const first = await queryBoth(accessToken, q);
  if (first.people.length) return { people: first.people.slice(0, 20) };
  if (first.error === "scope" || first.error === "api" || first.error === "refresh") {
    return { people: [], error: first.error };
  }
  // The People API fills its search index lazily, so the first query often comes back empty.
  if (first.ok) {
    const second = await queryBoth(accessToken, q);
    if (second.people.length) return { people: second.people.slice(0, 20) };
    if (second.error === "scope" || second.error === "api" || second.error === "refresh") {
      return { people: [], error: second.error };
    }
  }
  const listed = await cachedDirectory(accessToken);
  const matched = matchGooglePeople(listed.people, q).slice(0, 20);
  if (matched.length || listed.ok || first.ok) return { people: matched };
  return { people: [], error: listed.error ?? first.error ?? "google" };
}

export async function getGooglePerson(accessToken: string, resourceName: string): Promise<GooglePerson | null> {
  if (!isGoogleResourceName(resourceName)) return null;
  const mask = resourceName.startsWith("otherContacts/") ? OTHER_READ_MASK : CONTACT_READ_MASK;
  const response = await googleGet(
    `https://people.googleapis.com/v1/${resourceName}?personFields=${mask}`,
    accessToken,
  );
  if (!response.ok || !response.json) return null;
  return normalizeGooglePerson(response.json as GooglePersonPayload);
}

async function queryBoth(accessToken: string, query: string): Promise<EndpointHit> {
  const [mine, other] = await Promise.all([
    searchEndpoint(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=${CONTACT_READ_MASK}&pageSize=30`,
      accessToken,
    ),
    searchEndpoint(
      `https://people.googleapis.com/v1/otherContacts:search?query=${encodeURIComponent(query)}&readMask=${OTHER_READ_MASK}&pageSize=30`,
      accessToken,
    ),
  ]);
  return {
    ok: mine.ok || other.ok,
    people: mergeGooglePeople([...mine.people, ...other.people]),
    error: mine.ok || other.ok ? undefined : mine.error ?? other.error,
  };
}

async function searchEndpoint(url: string, accessToken: string): Promise<EndpointHit> {
  const response = await googleGet(url, accessToken);
  if (!response.ok || !response.json) return { ok: false, people: [], error: response.error };
  return { ok: true, people: peopleFromSearch(response.json as PeopleSearchResponse) };
}

function cachedDirectory(accessToken: string): Promise<Directory> {
  const key = createHash("sha256").update(accessToken).digest("hex");
  const existing = directoryLoads.get(key);
  if (existing && (existing.expires === 0 || existing.expires > Date.now())) return existing.pending;
  const entry: { expires: number; pending: Promise<Directory> } = {
    expires: 0,
    pending: Promise.resolve({ ok: false, people: [] }),
  };
  entry.pending = loadDirectory(accessToken).then((result) => {
    if (result.ok) entry.expires = Date.now() + DIRECTORY_TTL_MS;
    else directoryLoads.delete(key);
    return result;
  });
  directoryLoads.set(key, entry);
  return entry.pending;
}

async function loadDirectory(accessToken: string): Promise<Directory> {
  const [saved, other] = await Promise.all([
    listPeople(
      accessToken,
      `https://people.googleapis.com/v1/people/me/connections?personFields=${CONTACT_READ_MASK}&pageSize=1000&sortOrder=LAST_MODIFIED_DESCENDING`,
      "connections",
    ),
    listPeople(
      accessToken,
      `https://people.googleapis.com/v1/otherContacts?readMask=${OTHER_READ_MASK}&pageSize=1000`,
      "otherContacts",
    ),
  ]);
  if (!saved.ok && !other.ok) return { ok: false, people: [], error: saved.error ?? other.error };
  return { ok: true, people: mergeGooglePeople([...saved.people, ...other.people]) };
}

async function listPeople(
  accessToken: string,
  firstUrl: string,
  field: "connections" | "otherContacts",
): Promise<EndpointHit> {
  const people: GooglePerson[] = [];
  let url: string | null = firstUrl;
  let ok = false;
  for (let page = 0; page < DIRECTORY_PAGES && url; page += 1) {
    const response = await googleGet(url, accessToken);
    if (!response.ok || !response.json || typeof response.json !== "object") {
      if (!ok) return { ok: false, people, error: response.error };
      break;
    }
    ok = true;
    const body = response.json as PeopleListResponse;
    for (const row of body[field] ?? []) {
      const person = normalizeGooglePerson(row);
      if (person) people.push(person);
    }
    const token = body.nextPageToken?.trim();
    url = token ? pageUrl(firstUrl, token) : null;
  }
  return { ok, people };
}

function pageUrl(base: string, pageToken: string): string {
  const url = new URL(base);
  url.searchParams.set("pageToken", pageToken);
  return url.toString();
}

async function missingContactsScope(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const json = (await response.json()) as { scope?: string };
    const scopes = (json.scope ?? "").split(/\s+/).filter(Boolean);
    if (!scopes.length) return false;
    return !scopes.some((scope) => scope.includes("/auth/contacts"));
  } catch {
    return false;
  }
}

async function googleGet(url: string, accessToken: string): Promise<{ ok: boolean; json: unknown; error?: GoogleContactsError }> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as GoogleErrorBody | null;
      return { ok: false, json: null, error: classifyGoogleError(response.status, body) };
    }
    return { ok: true, json: await response.json() };
  } catch {
    return { ok: false, json: null, error: "google" };
  }
}

function personSearchText(person: GooglePerson): string {
  return [
    person.displayName,
    person.givenName,
    person.familyName,
    person.firstName,
    person.lastName,
    person.firstNameHe,
    person.lastNameHe,
    person.email,
    person.mobile,
    person.title,
    person.workplace,
  ]
    .join(" ")
    .toLowerCase();
}
