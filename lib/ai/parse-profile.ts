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

const DATE_LINE = new RegExp(
  `^(?:${MONTH})\\.?\\s+\\d{4}\\s*[-–—]\\s*(?:(?:${MONTH})\\.?\\s+\\d{4}|present|current|היום|הווה|נוכחי)|\\d{4}\\s*[-–—]\\s*(?:\\d{4}|present|current|היום|הווה|נוכחי)`,
  "i",
);

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
  const lines = raw.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
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
  proposal.certificates = certificates(sections.get("certs") ?? []);
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
  return dates
    .map((dateIndex, index) => {
      const previous = index === 0 ? -1 : dates[index - 1];
      const next = dates[index + 1] ?? lines.length;
      const head = lines.slice(previous + 1, dateIndex).filter((line) => !isMeta(line)).slice(-2);
      const reserved = index < dates.length - 1 ? Math.min(2, Math.max(0, next - dateIndex - 1)) : 0;
      const tail = lines.slice(dateIndex + 1, next - reserved).filter((line) => !isMeta(line));
      return roleFromHead(head, tail, lines[dateIndex], index, kind);
    })
    .filter((row) => row.title || row.company);
}

function roleFromHead(head: string[], tail: string[], dateLine: string, index: number, kind: "employment" | "volunteer"): ProposedEmployment {
  const dated = parseDateLine(dateLine);
  const company = head[0] ?? "";
  const title = head[1] && head[1] !== company ? head[1] : "";
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
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    current.push(line);
    if (DATE_LINE.test(line)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks
    .map((chunk, index) => {
      const dateIndex = chunk.findIndex((line) => DATE_LINE.test(line));
      const head = (dateIndex >= 0 ? chunk.slice(0, dateIndex) : chunk).filter((line) => !isMeta(line));
      const dated = dateIndex >= 0 ? parseDateLine(chunk[dateIndex]) : { startDate: "", endDate: "", isCurrent: false };
      return {
        key: `ed${index + 1}`,
        school: head[0] ?? "",
        degree: head[1] ?? "",
        field: head[2] ?? "",
        startDate: dated.startDate,
        endDate: dated.endDate,
      };
    })
    .filter((row) => row.school);
}

function certificates(lines: string[]) {
  const rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (DATE_LINE.test(line) || isMeta(line)) continue;
    const next = lines[index + 1] ?? "";
    const issued = lines.slice(index, index + 3).find((item) => DATE_LINE.test(item));
    rows.push({
      key: `c${rows.length + 1}`,
      name: line,
      issuer: next && !DATE_LINE.test(next) ? next : "",
      issuedOn: issued ? parseDateLine(issued).startDate : "",
      url: "",
    });
    if (next && !DATE_LINE.test(next)) index += 1;
    if (issued) index += 1;
  }
  return rows;
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
  const years = [...line.matchAll(/\d{4}/g)].map((match) => match[1] ? match[0] : match[0]);
  const month = line.match(new RegExp(MONTH, "i"));
  const monthNumber = month ? MONTHS[month[0].replace(".", "").toLowerCase()] ?? MONTHS[month[0]] : "";
  const startYear = years[0] ?? "";
  const isCurrent = /present|current|היום|הווה|נוכחי/i.test(line);
  const endYear = isCurrent ? "" : years[1] ?? "";
  return {
    startDate: startYear ? `${startYear}-${monthNumber || "01"}-01` : "",
    endDate: endYear ? `${endYear}-01-01` : "",
    isCurrent,
  };
}
