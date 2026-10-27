import { companyNameKey } from "../company-name";

export const RULE_KEYS = [
  "excluded",
  "description",
  "region",
  "unknown_location",
  "outside_israel",
  "age",
  "junior",
  "known",
] as const;

export type RuleKey = (typeof RULE_KEYS)[number];

export const REGION_IDS = ["telAviv", "sharon", "center", "jerusalem", "judea", "south", "north"] as const;

export type RegionId = (typeof REGION_IDS)[number];

export type Level = "lead" | "engineer" | "above" | "other";

export type Freshness = "fresh" | "aging" | "updated" | "older" | "unknown";

const REGION_PLACES: Record<RegionId, readonly string[]> = {
  telAviv: [
    "tel aviv", "תל אביב", "gush dan", "גוש דן", "ramat gan", "רמת גן", "givatayim", "גבעתיים",
    "bnei brak", "בני ברק", "holon", "חולון", "bat yam", "בת ים", "kiryat ono", "קריית אונו",
    "givat shmuel", "גבעת שמואל", "or yehuda", "אור יהודה", "azor", "אזור", "petah tikva", "פתח תקווה",
    "ramat hasharon", "רמת השרון",
  ],
  sharon: [
    "sharon", "השרון", "netanya", "נתניה", "herzliya", "הרצליה", "ra'anana", "raanana", "רעננה",
    "kfar saba", "כפר סבא", "hod hasharon", "הוד השרון", "hadera", "חדרה", "caesarea", "קיסריה",
    "zichron", "זיכרון", "even yehuda", "אבן יהודה", "ramat hasharon", "רמת השרון", "kadima", "קדימה",
  ],
  center: [
    "center", "המרכז", "shfela", "השפלה", "rishon", "ראשון לציון", "rehovot", "רחובות", "ness ziona", "נס ציונה",
    "yavne", "יבנה", "lod", "לוד", "ramla", "רמלה", "modiin", "מודיעין", "rosh haayin", "ראש העין",
    "shoham", "שהם", "petah tikva", "פתח תקווה", "yehud", "יהוד",
  ],
  jerusalem: [
    "jerusalem", "ירושלים", "mevaseret", "מבשרת", "maale adumim", "מעלה אדומים", "beit shemesh", "בית שמש",
    "givat zeev", "גבעת זאב",
  ],
  judea: [
    "judea", "יהודה", "samaria", "שומרון", "ariel", "אריאל", "karnei shomron", "קרני שומרון",
    "efrat", "אפרת", "beitar", "ביתר", "maale adumim", "מעלה אדומים", "modiin illit", "מודיעין עילית",
  ],
  south: [
    "south", "הדרום", "beer sheva", "be'er sheva", "beersheba", "באר שבע", "ashdod", "אשדוד",
    "ashkelon", "אשקלון", "kiryat gat", "קריית גת", "sderot", "שדרות", "eilat", "אילת",
    "netivot", "נתיבות", "ofakim", "אופקים", "dimona", "דימונה", "yeruham", "ירוחם",
  ],
  north: [
    "north", "הצפון", "haifa", "חיפה", "nazareth", "נצרת", "acre", "akko", "עכו", "karmiel", "כרמיאל",
    "tiberias", "טבריה", "tzfat", "safed", "צפת", "afula", "עפולה", "yokneam", "יקנעם",
    "kiryat ata", "קריית אתא", "kiryat bialik", "קריית ביאליק", "nahariya", "נהריה", "caesarea", "קיסריה",
  ],
};

const ABROAD = [
  "london", "new york", "united states", "united kingdom", "usa", "u.s.", "berlin", "paris", "munich",
  "amsterdam", "singapore", "bangalore", "bengaluru", "austin", "seattle", "san francisco", "california",
  "germany", "france", "spain", "canada", "australia", "poland", "ukraine", "romania", "india", "netherlands",
  "ireland", "dublin", "warsaw", "kyiv", "kiev", "remote us", "remote - us", "remote, us",
];

const ISRAEL_TOKENS = ["israel", "ישראל", "worldwide", "anywhere", "global remote", "remote worldwide", "work from anywhere"];

const SOFTWARE = /(software|\bsw\b|automation|sdet|fullstack|full-stack|backend|front-end|frontend|\bweb\b|\bmobile\b|\bapi\b|\bai\b|developer|מפתח|תוכנה|אוטומציה)/i;

const JUNIOR = /(junior|\bjr\.?\b|intern|internship|\bstudent\b|entry[- ]level|ג'וניור|מתמחה|סטודנט)/i;

const ABOVE = /(\bdirector\b|vice president|\bvp\b|\bchief\b|\bcto\b|\bceo\b|\bcfo\b|\bcoo\b|סמנכ״ל|סמנכ"ל|מנכ״ל|מנכ"ל)/i;

const LEAD = /(team lead|tech lead|\blead\b|manager|head of|ראש צוות|ראש\/ת|מוביל|\bמנהל)/i;

const ENGINEER = /(engineer|developer|מפתח|מהנדס)/i;

export type SearchProfile = {
  terms: string[];
  excludedTitle: string[];
  excludedDescription: string[];
  maxAgeDays: number;
  hideJunior: boolean;
  regionsOff: RegionId[];
  extraPlaces: string[];
  disabledRules: ReadonlySet<string>;
};

export type Candidate = {
  id: string;
  company: string;
  title: string;
  location: string;
  description: string;
  url: string;
  externalId: string;
  publishedAt: Date | null;
  updatedOnly: boolean;
  israelAssumed: boolean;
};

export type KnownJob = {
  company: string;
  title: string;
  urls: string[];
  lastActionAt: Date;
};

export type Verdict = {
  passesTerms: boolean;
  failed: RuleKey[];
  level: Level;
  softwareShaped: boolean;
  freshness: Freshness;
  reposted: boolean;
  known: boolean;
};

export type InboxRow = {
  id: string;
  failed: RuleKey[];
  waived: RuleKey[];
  level: Level;
  freshness: Freshness;
  reposted: boolean;
};

export function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function roleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+[—–-]\s+linkedin\b.*$/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname.toLowerCase()}${path}`.replace(/^www\./, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function includesTerm(haystack: string, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return haystack.toLowerCase().includes(needle);
}

function ageDays(publishedAt: Date, now: Date): number {
  return (now.getTime() - publishedAt.getTime()) / 86_400_000;
}

export function levelOf(title: string): Level {
  if (ABOVE.test(title)) return "above";
  if (LEAD.test(title)) return "lead";
  if (ENGINEER.test(title)) return "engineer";
  return "other";
}

export function freshnessOf(candidate: Pick<Candidate, "publishedAt" | "updatedOnly">, now: Date): Freshness {
  if (candidate.updatedOnly) return "updated";
  if (!candidate.publishedAt) return "unknown";
  const days = ageDays(candidate.publishedAt, now);
  if (days <= 7) return "fresh";
  if (days <= 14) return "aging";
  return "older";
}

function placeHits(location: string, names: readonly string[]): boolean {
  const text = location.toLowerCase();
  return names.some((name) => {
    const needle = name.toLowerCase();
    if (needle.length < 4) return false;
    if (/[\u0590-\u05ff]/.test(needle)) return text.includes(needle);
    const pattern = new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    return pattern.test(text);
  });
}

export function regionsIn(location: string, extraPlaces: readonly string[]): RegionId[] {
  if (placeHits(location, extraPlaces)) return [];
  return REGION_IDS.filter((id) => placeHits(location, REGION_PLACES[id]));
}

function mentionsIsrael(location: string): boolean {
  const text = location.toLowerCase();
  return ISRAEL_TOKENS.some((token) => text.includes(token)) || /\bremote\b/i.test(location);
}

function mentionsAbroad(location: string): boolean {
  const text = location.toLowerCase();
  return ABROAD.some((token) => text.includes(token));
}

export function judge(candidate: Candidate, profile: SearchProfile, known: readonly KnownJob[], now: Date): Verdict {
  const failed: RuleKey[] = [];
  const title = candidate.title;
  const passesTerms = profile.terms.length > 0 && profile.terms.some((term) => includesTerm(title, term));
  if (profile.excludedTitle.some((term) => includesTerm(title, term))) failed.push("excluded");

  const descriptionHits = profile.excludedDescription.filter((term) => includesTerm(candidate.description, term)).length;
  const softwareShaped = SOFTWARE.test(title);
  if (descriptionHits >= 2 && !softwareShaped) failed.push("description");

  const regions = regionsIn(candidate.location, profile.extraPlaces);
  const israel = candidate.israelAssumed || mentionsIsrael(candidate.location);
  const abroad = mentionsAbroad(candidate.location);
  if (!israel && abroad) failed.push("outside_israel");
  else if (regions.length > 0 && regions.every((region) => profile.regionsOff.includes(region))) failed.push("region");
  else if (!israel && !abroad && regions.length === 0 && candidate.location.trim()) failed.push("unknown_location");
  else if (!candidate.location.trim() && !candidate.israelAssumed) failed.push("unknown_location");

  if (candidate.publishedAt && ageDays(candidate.publishedAt, now) > profile.maxAgeDays) failed.push("age");
  if (profile.hideJunior && JUNIOR.test(title)) failed.push("junior");

  const company = companyNameKey(candidate.company);
  const role = roleKey(title);
  const url = canonicalUrl(candidate.url);
  const match = known.find((job) => {
    if (job.urls.some((item) => canonicalUrl(item) === url && url !== "")) return true;
    return company !== "" && company === companyNameKey(job.company) && role !== "" && role === roleKey(job.title);
  });
  let reposted = false;
  if (match) {
    const published = candidate.publishedAt;
    if (published && published.getTime() > match.lastActionAt.getTime()) reposted = true;
    else failed.push("known");
  }

  return {
    passesTerms,
    failed,
    level: levelOf(title),
    softwareShaped,
    freshness: freshnessOf(candidate, now),
    reposted,
    known: Boolean(match),
  };
}

function enabled(profile: SearchProfile, rule: RuleKey): boolean {
  return !profile.disabledRules.has(rule);
}

export function blockingRules(verdict: Verdict, profile: SearchProfile): { blocking: RuleKey[]; waived: RuleKey[] } {
  const blocking = verdict.failed.filter((rule) => enabled(profile, rule));
  const waived = verdict.failed.filter((rule) => !enabled(profile, rule));
  return { blocking, waived };
}

/** Jobs that pass the search terms, split into the inbox, the reposted block, and per-rule hold counts. */
export function classifyInbox(
  candidates: readonly Candidate[],
  profile: SearchProfile,
  known: readonly KnownJob[],
  now: Date,
): { visible: InboxRow[]; reposted: InboxRow[]; counts: Record<RuleKey, number> } {
  const counts = Object.fromEntries(RULE_KEYS.map((key) => [key, 0])) as Record<RuleKey, number>;
  const visible: InboxRow[] = [];
  const reposted: InboxRow[] = [];
  for (const candidate of candidates) {
    const verdict = judge(candidate, profile, known, now);
    if (!verdict.passesTerms) continue;
    const { blocking, waived } = blockingRules(verdict, profile);
    for (const rule of blocking) counts[rule] += 1;
    const row: InboxRow = {
      id: candidate.id,
      failed: blocking,
      waived,
      level: verdict.level,
      freshness: verdict.freshness,
      reposted: verdict.reposted,
    };
    if (blocking.length > 0) continue;
    if (verdict.reposted) reposted.push(row);
    else visible.push(row);
  }
  const rank: Record<Level, number> = { lead: 0, engineer: 1, other: 2, above: 3 };
  visible.sort((a, b) => rank[a.level] - rank[b.level]);
  return { visible, reposted, counts };
}

export function localHour(timeZone: string, now: Date): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).formatToParts(now);
    return Number(hour.find((part) => part.type === "hour")?.value ?? "0");
  } catch {
    return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", hour: "numeric", hourCycle: "h23" })
      .formatToParts(now)
      .reduce((value, part) => (part.type === "hour" ? Number(part.value) : value), 0);
  }
}

export type SearchDueInput = {
  jobSearchEnabled: boolean;
  timeZone: string;
  lastRunAt: Date | null;
  phase: "boards" | "mail" | "done" | null;
  now: Date;
};

/** A disabled account is never selected. An unfinished run resumes. A finished run waits two hours, inside 08:00–22:00 local. */
export function searchIsDue(input: SearchDueInput): boolean {
  if (!input.jobSearchEnabled) return false;
  if (input.phase === "boards" || input.phase === "mail") return true;
  const hour = localHour(input.timeZone, input.now);
  if (hour < 8 || hour > 22) return false;
  if (!input.lastRunAt) return true;
  return input.now.getTime() - input.lastRunAt.getTime() >= 2 * 60 * 60 * 1000;
}

export function mainNav(jobSearch: boolean): string[] {
  const items = ["/settings", "/profile", "/dashboard"];
  if (jobSearch) items.push("/opportunities");
  items.push("/jobs", "/companies", "/events", "/notes", "/contacts");
  return items;
}

/** The admin checkbox writes this field and nothing else. */
export function jobSearchPatch(enabled: boolean): { jobSearchEnabled: boolean } {
  return { jobSearchEnabled: enabled };
}

export function replyShouldApply(messageAt: Date, latestStatusAt: Date | null): boolean {
  if (!latestStatusAt) return true;
  return messageAt.getTime() > latestStatusAt.getTime();
}

export function sameOpening(a: { company: string; title: string; url: string }, b: { company: string; title: string; url: string }): boolean {
  const left = canonicalUrl(a.url);
  const right = canonicalUrl(b.url);
  if (left && left === right) return true;
  const company = companyNameKey(a.company);
  const role = roleKey(a.title);
  return company !== "" && role !== "" && company === companyNameKey(b.company) && role === roleKey(b.title);
}

export function matchKnownJob<T extends { companyName: string; title: string }>(company: string, title: string, jobs: readonly T[]): T | null {
  const companyKey = companyNameKey(company);
  const wanted = roleKey(title);
  if (!companyKey) return null;
  const sameCompany = jobs.filter((job) => companyNameKey(job.companyName) === companyKey);
  if (!sameCompany.length) return null;
  if (!wanted) return sameCompany[0];
  return sameCompany.find((job) => roleKey(job.title) === wanted) ?? sameCompany.find((job) => roleKey(job.title).includes(wanted) || wanted.includes(roleKey(job.title))) ?? null;
}
