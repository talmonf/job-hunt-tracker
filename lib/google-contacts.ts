import { decryptSecret } from "./crypto";
import { googleAccessToken } from "./calendar";
import { isGoogleResourceName } from "./entity-links";

const READ_MASK = "names,organizations,occupations,urls";

export type GooglePerson = {
  resourceName: string;
  displayName: string;
  title: string;
  workplace: string;
};

type PeopleSearchResponse = {
  results?: { person?: GooglePersonPayload }[];
};

type OtherContactsSearchResponse = {
  results?: { person?: GooglePersonPayload }[];
};

type GooglePersonPayload = {
  resourceName?: string;
  names?: { displayName?: string; unstructuredName?: string }[];
  organizations?: { title?: string; name?: string; current?: boolean }[];
  occupations?: { value?: string }[];
};

export async function contactsAccessToken(encryptedRefresh: string): Promise<string | null> {
  return googleAccessToken(decryptSecret(encryptedRefresh));
}

export async function searchGooglePeople(accessToken: string, query: string): Promise<GooglePerson[]> {
  const q = query.trim();
  if (!q) return [];
  const [mine, other] = await Promise.all([
    searchEndpoint(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(q)}&readMask=${READ_MASK}&pageSize=10`,
      accessToken,
    ),
    searchEndpoint(
      `https://people.googleapis.com/v1/otherContacts:search?query=${encodeURIComponent(q)}&readMask=${READ_MASK}&pageSize=10`,
      accessToken,
    ),
  ]);
  const merged = new Map<string, GooglePerson>();
  for (const person of [...mine, ...other]) {
    if (!merged.has(person.resourceName)) merged.set(person.resourceName, person);
  }
  return [...merged.values()];
}

export async function getGooglePerson(accessToken: string, resourceName: string): Promise<GooglePerson | null> {
  if (!isGoogleResourceName(resourceName)) return null;
  const response = await fetch(
    `https://people.googleapis.com/v1/${resourceName}?personFields=${READ_MASK}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) return null;
  return normalizePerson((await response.json()) as GooglePersonPayload);
}

async function searchEndpoint(url: string, accessToken: string): Promise<GooglePerson[]> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return [];
  const json = (await response.json()) as PeopleSearchResponse & OtherContactsSearchResponse;
  return (json.results ?? []).map((row) => normalizePerson(row.person ?? {})).filter((person): person is GooglePerson => Boolean(person));
}

function normalizePerson(person: GooglePersonPayload): GooglePerson | null {
  const resourceName = person.resourceName?.trim() ?? "";
  if (!isGoogleResourceName(resourceName)) return null;
  const name = person.names?.[0];
  const displayName = (name?.displayName || name?.unstructuredName || "").trim();
  if (!displayName) return null;
  const org = person.organizations?.find((item) => item.current) ?? person.organizations?.[0];
  const title = (org?.title || person.occupations?.[0]?.value || "").trim();
  const workplace = (org?.name || "").trim();
  return { resourceName, displayName, title, workplace };
}
