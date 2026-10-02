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

export type BilingualName = {
  firstName: string;
  lastName: string;
  firstNameHe: string;
  lastNameHe: string;
};

export function emptyBilingualName(): BilingualName {
  return { firstName: "", lastName: "", firstNameHe: "", lastNameHe: "" };
}

export function displayPersonName(name: BilingualName): string {
  return joinPersonName(name.firstName, name.lastName) || joinPersonName(name.firstNameHe, name.lastNameHe);
}

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const LATIN_CHAR = /[A-Za-z]/;

function charScript(char: string): "he" | "en" | null {
  if (HEBREW_CHAR.test(char)) return "he";
  if (LATIN_CHAR.test(char)) return "en";
  return null;
}

function textScript(value: string): "he" | "en" | "mixed" | "none" {
  let hebrew = false;
  let latin = false;
  for (const char of value) {
    const script = charScript(char);
    if (script === "he") hebrew = true;
    if (script === "en") latin = true;
  }
  if (hebrew && latin) return "mixed";
  if (hebrew) return "he";
  if (latin) return "en";
  return "none";
}

function fillNameSlot(slots: BilingualName, kind: "first" | "last", script: "he" | "en", value: string) {
  const key =
    kind === "first" ? (script === "he" ? "firstNameHe" : "firstName") : script === "he" ? "lastNameHe" : "lastName";
  if (!slots[key] && value) slots[key] = value;
}

function placeNamePart(value: string, kind: "first" | "last", slots: BilingualName) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return;
  const script = textScript(trimmed);
  if (script === "he" || script === "en") {
    fillNameSlot(slots, kind, script, trimmed);
    return;
  }
  if (script === "none") {
    fillNameSlot(slots, kind, "en", trimmed);
    return;
  }
  const grouped = { he: [] as string[], en: [] as string[] };
  for (const token of trimmed.split(" ")) {
    const tokenScript = textScript(token);
    if (tokenScript === "he") grouped.he.push(token);
    else if (tokenScript !== "mixed") grouped.en.push(token);
    else groupedByRun(token, grouped);
  }
  if (grouped.en.length) fillNameSlot(slots, kind, "en", grouped.en.join(" "));
  if (grouped.he.length) fillNameSlot(slots, kind, "he", grouped.he.join(" "));
}

function groupedByRun(token: string, grouped: { he: string[]; en: string[] }) {
  let run: { script: "he" | "en"; chars: string[] } | null = null;
  const flush = () => {
    if (!run) return;
    const text = run.chars.join("").replace(/^[\s'".,-]+|[\s'".,-]+$/g, "");
    if (text) grouped[run.script].push(text);
    run = null;
  };
  for (const char of token) {
    const script = charScript(char);
    if (!script) {
      if (run) run.chars.push(char);
      continue;
    }
    if (!run || run.script !== script) {
      flush();
      run = { script, chars: [char] };
    } else {
      run.chars.push(char);
    }
  }
  flush();
}

export function assignFieldsByScript(firstName: string, lastName: string): BilingualName {
  const slots = emptyBilingualName();
  placeNamePart(firstName, "first", slots);
  placeNamePart(lastName, "last", slots);
  return slots;
}

export function assignNameByScript(fullName: string): BilingualName {
  const slots = emptyBilingualName();
  const split = splitPersonName(fullName);
  placeNamePart(split.firstName, "first", slots);
  placeNamePart(split.lastName, "last", slots);
  return slots;
}

export type GoogleNameFields = {
  metadata?: { primary?: boolean };
  displayName?: string;
  unstructuredName?: string;
  givenName?: string;
  familyName?: string;
  phoneticFullName?: string;
  phoneticGivenName?: string;
  phoneticFamilyName?: string;
};

export function bilingualNameFromGoogle(names: GoogleNameFields[] | undefined): BilingualName {
  const slots = emptyBilingualName();
  const ordered = [...(names ?? [])].sort(
    (left, right) => Number(Boolean(right.metadata?.primary)) - Number(Boolean(left.metadata?.primary)),
  );
  for (const name of ordered) {
    const given = name.givenName?.trim() ?? "";
    const family = name.familyName?.trim() ?? "";
    if (given || family) {
      placeNamePart(given, "first", slots);
      placeNamePart(family, "last", slots);
    } else {
      const split = splitPersonName(name.displayName || name.unstructuredName || "");
      placeNamePart(split.firstName, "first", slots);
      placeNamePart(split.lastName, "last", slots);
    }
    const phoneticGiven = name.phoneticGivenName?.trim() ?? "";
    const phoneticFamily = name.phoneticFamilyName?.trim() ?? "";
    if (phoneticGiven || phoneticFamily) {
      placeNamePart(phoneticGiven, "first", slots);
      placeNamePart(phoneticFamily, "last", slots);
    } else if (name.phoneticFullName?.trim()) {
      const split = splitPersonName(name.phoneticFullName);
      placeNamePart(split.firstName, "first", slots);
      placeNamePart(split.lastName, "last", slots);
    }
  }
  return slots;
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

