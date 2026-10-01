import { decryptSecret } from "./crypto";
import { googleAccessToken } from "./calendar";
import { isGoogleResourceName } from "./entity-links";
import { normalizeGooglePerson, type GooglePerson, type GooglePersonPayload } from "./google-person";

const CONTACT_READ_MASK = "names,organizations,occupations,urls,emailAddresses,phoneNumbers";
const OTHER_READ_MASK = "names,emailAddresses,phoneNumbers";

export type { GooglePerson };

type PeopleSearchResponse = {
  results?: { person?: GooglePersonPayload }[];
};

export async function contactsAccessToken(encryptedRefresh: string): Promise<string | null> {
  return googleAccessToken(decryptSecret(encryptedRefresh));
}

export async function searchGooglePeople(accessToken: string, query: string): Promise<GooglePerson[]> {
  const q = query.trim();
  if (!q) return [];
  const [mine, other] = await Promise.all([
    searchEndpoint(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(q)}&readMask=${CONTACT_READ_MASK}&pageSize=10`,
      accessToken,
    ),
    searchEndpoint(
      `https://people.googleapis.com/v1/otherContacts:search?query=${encodeURIComponent(q)}&readMask=${OTHER_READ_MASK}&pageSize=10`,
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
    `https://people.googleapis.com/v1/${resourceName}?personFields=${CONTACT_READ_MASK}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) return null;
  return normalizeGooglePerson((await response.json()) as GooglePersonPayload);
}

async function searchEndpoint(url: string, accessToken: string): Promise<GooglePerson[]> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return [];
  const json = (await response.json()) as PeopleSearchResponse;
  return (json.results ?? []).map((row) => normalizeGooglePerson(row.person ?? {})).filter((person): person is GooglePerson => Boolean(person));
}
