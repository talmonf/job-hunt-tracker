import { createHash } from "crypto";
import { decryptSecret } from "./crypto";
import { googleAccessToken } from "./calendar";
import { isGoogleResourceName } from "./entity-links";
import { normalizeGooglePerson, type GooglePerson, type GooglePersonPayload } from "./google-person";

const CONTACT_READ_MASK = "names,organizations,occupations,urls,emailAddresses,phoneNumbers,addresses";
const OTHER_READ_MASK = "names,emailAddresses,phoneNumbers";
const DIRECTORY_TTL_MS = 2 * 60 * 1000;
const DIRECTORY_PAGES = 3;

export type { GooglePerson };

export type GooglePeopleSearch = {
  people: GooglePerson[];
  error?: "google";
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
};

type Directory = { ok: boolean; people: GooglePerson[] };

const directoryLoads = new Map<string, { expires: number; pending: Promise<Directory> }>();

export async function contactsAccessToken(encryptedRefresh: string): Promise<string | null> {
  return googleAccessToken(decryptSecret(encryptedRefresh));
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
  const first = await queryBoth(accessToken, q);
  if (first.people.length) return { people: first.people.slice(0, 20) };
  // The People API fills its search index lazily, so the first query often comes back empty.
  if (first.ok) {
    const second = await queryBoth(accessToken, q);
    if (second.people.length) return { people: second.people.slice(0, 20) };
  }
  const listed = await cachedDirectory(accessToken);
  const matched = matchGooglePeople(listed.people, q).slice(0, 20);
  if (matched.length || listed.ok || first.ok) return { people: matched };
  return { people: [], error: "google" };
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
  };
}

async function searchEndpoint(url: string, accessToken: string): Promise<EndpointHit> {
  const response = await googleGet(url, accessToken);
  if (!response.ok || !response.json) return { ok: false, people: [] };
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
  if (!saved.ok && !other.ok) return { ok: false, people: [] };
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
    if (!response.ok || !response.json || typeof response.json !== "object") break;
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

async function googleGet(url: string, accessToken: string): Promise<{ ok: boolean; json: unknown }> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { ok: false, json: null };
    return { ok: true, json: await response.json() };
  } catch {
    return { ok: false, json: null };
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
