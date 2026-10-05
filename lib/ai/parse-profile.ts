import {
  emptyProposal,
  type Proposal,
  type ProposedBullet,
  type ProposedEmployment,
} from "./proposal";

const HEADER =
  /^(contact|top skills|skills|languages|certifications?|licenses?(?:\s*&\s*certifications?)?|honors(?:\s*&\s*awards)?|summary|about|profile|experience|work experience|education|volunteer(?:ing| experience)?|projects?|publications?|קישור|כישורים|מיומנויות|שפות|תעודות|רישיונות(?:\s*ותעודות)?|אודות|תקציר|פרופיל|ניסיון(?:\s+(?:תעסוקתי|מקצועי))?|השכלה|התנדבות)$/i;

const MONTH =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר";

const DATE_RANGE = new RegExp(
  `(?:${MONTH})\\.?\\s+\\d{4}\\s*[-–—]\\s*(?:(?:${MONTH})\\.?\\s+\\d{4}|present|current|היום|הווה|נוכחי)|\\d{4}\\s*[-–—]\\s*(?:(?:${MONTH})\\.?\\s+\\d{4}|\\d{4}|present|current|היום|הווה|נוכחי)`,
  "i",
);

const DATE_LINE = new RegExp(`^(?:${DATE_RANGE.source})`, "i");

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
  ינואר: "01",
  פברואר: "02",
  מרץ: "03",
  מרס: "03",
  אפריל: "04",
  מאי: "05",
  יוני: "06",
  יולי: "07",
  אוגוסט: "08",
  ספטמבר: "09",
  אוקטובר: "10",
  נובמבר: "11",
  דצמבר: "12",
};

type SectionId = "about" | "experience" | "education" | "skills" | "certs" | "volunteer" | "ignore";

export function parseProfileText(raw: string): Proposal {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^page \d+ of \d+$/i.test(line));
  const sections = new Map<SectionId, string[]>();
  let current: SectionId | "preamble" = "preamble";
  const preamble: string[] = [];
  for (const line of lines) {
    const header = sectionId(line);
    if (header) {
      current = header;
      continue;
    }
    if (current === "preamble") preamble.push(line);
    else {
      const bucket = sections.get(current) ?? [];
      bucket.push(line);
      sections.set(current, bucket);
    }
  }
  const proposal = emptyProposal();
  if (preamble.length > 1) proposal.headline = preamble[1];
  else if (preamble.length === 1 && !HEADER.test(preamble[0])) proposal.headline = preamble[0];
  proposal.aboutEn = languageLines(sections.get("about") ?? [], "en");
  proposal.aboutHe = languageLines(sections.get("about") ?? [], "he");
  proposal.employments = roles(sections.get("experience") ?? [], "employment");
  proposal.educations = studies(sections.get("education") ?? []);
  proposal.volunteers = roles(sections.get("volunteer") ?? [], "volunteer").map((row, index) => ({
    key: `v${index + 1}`,
    organization: row.company,
    role: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    textEn: row.bullets.map((bullet) => bullet.textEn).filter(Boolean).join("\n"),
    textHe: row.bullets.map((bullet) => bullet.textHe).filter(Boolean).join("\n"),
  }));
  const identity = peelIdentity(sections.get("certs") ?? []);
  if (!proposal.headline && identity.headline) proposal.headline = identity.headline;
  proposal.certificates = certificates(identity.lines);
  proposal.labels = skills(sections.get("skills") ?? []);
  return proposal;
}

function sectionId(line: string): SectionId | null {
  if (!HEADER.test(line)) return null;
  const value = line.toLowerCase();
  if (/about|summary|profile|אודות|תקציר|פרופיל/.test(value)) return "about";
  if (/experience|ניסיון/.test(value)) return "experience";
  if (/education|השכלה/.test(value)) return "education";
  if (/skill|כישור|מיומנו/.test(value)) return "skills";
  if (/certif|license|תעוד|רישיון/.test(value)) return "certs";
  if (/volunteer|התנדבות/.test(value)) return "volunteer";
  return "ignore";
}

function roles(lines: string[], kind: "employment" | "volunteer"): ProposedEmployment[] {
  const dates = lines.map((line, index) => (DATE_LINE.test(line) ? index : -1)).filter((index) => index >= 0);
  let company = "";
  return dates
    .map((dateIndex, index) => {
      const previous = index === 0 ? -1 : dates[index - 1];
      const header = roleHeader(lines, dateIndex, previous);
      if (header.company) company = header.company;
      const nextDate = dates[index + 1];
      const tailEnd = nextDate === undefined ? lines.length : roleHeader(lines, nextDate, dateIndex).headerStart;
      const tail = lines.slice(tailStart(lines, dateIndex), tailEnd).filter((line) => !isMeta(line));
      return roleFromHead(company, header.title, tail, lines[dateIndex], index, kind);
    })
    .filter((row) => row.title || row.company);
}

function roleHeader(lines: string[], dateIndex: number, previousDateIndex: number): { company: string | null; title: string; headerStart: number } {
  let cursor = dateIndex - 1;
  while (cursor > previousDateIndex && isMeta(lines[cursor])) cursor -= 1;
  const titleIndex = cursor;
  const title = titleIndex > previousDateIndex ? lines[titleIndex] : "";
  cursor -= 1;
  while (cursor > previousDateIndex && isMeta(lines[cursor])) cursor -= 1;
  if (cursor > previousDateIndex && isRoleHeaderLine(lines[cursor]) && isRoleHeaderLine(title)) {
    return { company: lines[cursor], title, headerStart: cursor };
  }
  return { company: null, title, headerStart: Math.max(titleIndex, previousDateIndex + 1) };
}

function tailStart(lines: string[], dateIndex: number): number {
  return isLocationAfter(lines, dateIndex) ? dateIndex + 2 : dateIndex + 1;
}

function isLocationAfter(lines: string[], dateIndex: number): boolean {
  const line = lines[dateIndex + 1];
  if (!line || !isLocationCandidate(line)) return false;
  const next = lines[dateIndex + 2];
  if (!next) return false;
  if (/^[•·]/.test(next) || next.length > 40 || isMeta(next)) return true;
  return false;
}

function isLocationCandidate(line: string): boolean {
  if (/^[•·]/.test(line) || line.length > 40 || DATE_LINE.test(line) || line.includes("|")) return false;
  if (line.split(/\s+/).length > 5) return false;
  return /^[\p{L}][\p{L}.'’\-\s,]*$/u.test(line);
}

function isRoleHeaderLine(line: string): boolean {
  if (!line || isMeta(line) || /^[•·]/.test(line) || /^[a-z]/.test(line)) return false;
  if (/[,:;]$/.test(line) || line.length > 80) return false;
  return true;
}

function roleFromHead(
  company: string,
  title: string,
  tail: string[],
  dateLine: string,
  index: number,
  kind: "employment" | "volunteer",
): ProposedEmployment {
  const dated = parseDateLine(dateLine);
  const key = `${kind === "employment" ? "e" : "v"}${index + 1}`;
  const bullets: ProposedBullet[] = tail
    .map((line) => line.replace(/^[•·\-–—]\s*/, "").trim())
    .filter(Boolean)
    .map((line, bulletIndex) => ({
      key: `${key}b${bulletIndex + 1}`,
      textEn: hebrewOnly(line) ? "" : line,
      textHe: /[\u0590-\u05FF]/.test(line) ? line : "",
    }));
  return { key, title, company, startDate: dated.startDate, endDate: dated.endDate, isCurrent: dated.isCurrent, bullets };
}

function studies(lines: string[]) {
  const joined = joinWrappedDates(lines);
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const line of joined) {
    current.push(line);
    if (DATE_RANGE.test(line)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks
    .map((chunk, index) => studyFromChunk(chunk, index))
    .filter((row) => row.school);
}

function studyFromChunk(chunk: string[], index: number) {
  const dateIndex = chunk.findIndex((line) => DATE_RANGE.test(line));
  const dated = dateIndex >= 0 ? parseDateLine(chunk[dateIndex]) : { startDate: "", endDate: "", isCurrent: false };
  if (dateIndex >= 0 && !DATE_LINE.test(chunk[dateIndex])) {
    const degreeLine = stripDatePhrase(chunk[dateIndex]);
    const degree = splitDegreeField(degreeLine);
    return {
      key: `ed${index + 1}`,
      school: chunk.slice(0, dateIndex).join(" ").trim(),
      degree: degree.degree,
      field: degree.field,
      startDate: dated.startDate,
      endDate: dated.endDate,
    };
  }
  const head = (dateIndex >= 0 ? chunk.slice(0, dateIndex) : chunk).filter((line) => !isMeta(line));
  return {
    key: `ed${index + 1}`,
    school: head[0] ?? "",
    degree: head[1] ?? "",
    field: head[2] ?? "",
    startDate: dated.startDate,
    endDate: dated.endDate,
  };
}

function joinWrappedDates(lines: string[]): string[] {
  const joined: string[] = [];
  const openMonth = new RegExp(`\\((?:${MONTH})\\.?\\s*$`, "i");
  for (const line of lines) {
    const previous = joined[joined.length - 1];
    if (previous && openMonth.test(previous)) joined[joined.length - 1] = `${previous} ${line}`;
    else joined.push(line);
  }
  return joined;
}

function stripDatePhrase(line: string): string {
  return line
    .replace(new RegExp(`\\s*·?\\s*\\((?:[^)]*\\d{4}[^)]*)\\)\\s*$`, "i"), "")
    .replace(new RegExp(`\\s*·?\\s*${DATE_RANGE.source}\\s*$`, "i"), "")
    .trim();
}

function splitDegreeField(value: string): { degree: string; field: string } {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      const degree = value.slice(0, index).trim();
      const field = value.slice(index + 1).trim();
      if (degree && field) return { degree, field };
    }
  }
  return { degree: value, field: "" };
}

function peelIdentity(lines: string[]): { lines: string[]; headline: string } {
  const pipe = lines.findIndex((line) => line.includes("|"));
  if (pipe <= 0 || !looksLikePersonName(lines[pipe - 1])) return { lines, headline: "" };
  let end = lines.length;
  const last = lines[end - 1];
  if (last && end - 1 > pipe && !last.includes("|") && isLocationCandidate(last)) end -= 1;
  const headline = lines
    .slice(pipe, end)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!headline) return { lines, headline: "" };
  return { lines: lines.slice(0, pipe - 1), headline };
}

function looksLikePersonName(line: string): boolean {
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[\p{Lu}][\p{L}'’.-]*$/u.test(word));
}

function certificates(lines: string[]) {
  const joined = joinWrappedNames(lines);
  const rows = [];
  for (let index = 0; index < joined.length; index += 1) {
    const line = joined[index];
    if (DATE_LINE.test(line) || isMeta(line)) continue;
    const next = joined[index + 1] ?? "";
    const issued = joined.slice(index, index + 3).find((item) => DATE_LINE.test(item));
    const hasIssuer = Boolean(next) && !DATE_LINE.test(next) && !isWrappedNameRemainder(line, next);
    rows.push({
      key: `c${rows.length + 1}`,
      name: line,
      issuer: hasIssuer ? next : "",
      issuedOn: issued ? parseDateLine(issued).startDate : "",
      url: "",
    });
    if (hasIssuer) index += 1;
    if (issued) index += 1;
  }
  return rows;
}

function joinWrappedNames(lines: string[]): string[] {
  const joined: string[] = [];
  for (const line of lines) {
    const previous = joined[joined.length - 1];
    if (previous && isWrappedNameRemainder(previous, line)) joined[joined.length - 1] = `${previous} ${line}`;
    else joined.push(line);
  }
  return joined;
}

function isWrappedNameRemainder(previous: string, next: string): boolean {
  if (!next || DATE_LINE.test(next) || DATE_LINE.test(previous)) return false;
  if (/[.!?|]$/.test(previous)) return false;
  const words = next.split(/\s+/);
  return previous.length >= 20 && words.length === 1 && next.length <= 12;
}

function skills(lines: string[]) {
  const names = lines
    .flatMap((line) => line.split(/[•·|,]/))
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 60);
  return [...new Set(names)].map((name, index) => ({
    key: `l${index + 1}`,
    kind: "skill" as const,
    name,
  }));
}

function languageLines(lines: string[], language: "en" | "he"): string {
  return lines
    .filter((line) => (language === "he" ? /[\u0590-\u05FF]/.test(line) : /[A-Za-z]/.test(line) || !/[\u0590-\u05FF]/.test(line)))
    .join("\n");
}

function hebrewOnly(line: string): boolean {
  return /[\u0590-\u05FF]/.test(line) && !/[A-Za-z]/.test(line);
}

function isMeta(line: string): boolean {
  return /^\(?\d+\s*(years?|months?|שנים|חודשים)/i.test(line) || /^(full-time|part-time|contract|freelance|משרה מלאה|משרה חלקית)$/i.test(line);
}

function parseDateLine(line: string): { startDate: string; endDate: string; isCurrent: boolean } {
  const pattern = new RegExp(`(${MONTH})\\.?\\s+(\\d{4})|(\\d{4})`, "gi");
  const found: { month: string; year: string }[] = [];
  for (const match of line.matchAll(pattern)) {
    if (match[1] && match[2]) found.push({ month: MONTHS[match[1].replace(".", "").toLowerCase()] ?? "", year: match[2] });
    else if (match[3]) found.push({ month: "", year: match[3] });
  }
  const isCurrent = /present|current|היום|הווה|נוכחי/i.test(line);
  return {
    startDate: found[0] ? careerDate(found[0]) : "",
    endDate: !isCurrent && found[1] ? careerDate(found[1]) : "",
    isCurrent,
  };
}

function careerDate(part: { month: string; year: string }): string {
  return part.month ? `${part.month}/${part.year}` : part.year;
}
