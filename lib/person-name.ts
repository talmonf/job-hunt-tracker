export function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}

export function joinPersonName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function namePartsFromPerson(person: {
  givenName: string;
  familyName: string;
  displayName: string;
}): { firstName: string; lastName: string } {
  const given = person.givenName.trim();
  const family = person.familyName.trim();
  if (given) return { firstName: given, lastName: family };
  if (family && person.displayName.trim()) return splitPersonName(person.displayName);
  if (family) return { firstName: "", lastName: family };
  return splitPersonName(person.displayName);
}

export function contactDetailsFromPerson(person: { emails: string[]; phones: string[] }): string {
  return [...person.emails, ...person.phones].map((item) => item.trim()).filter(Boolean).join("\n");
}
