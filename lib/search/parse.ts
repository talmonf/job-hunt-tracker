export type CareerProviderName = "greenhouse" | "lever" | "ashby" | "comeet" | "workday";

export type DetectedBoard = {
  provider: CareerProviderName;
  externalKey: string;
  careersUrl: string;
  companyHint: string;
};

export type FetchedJob = {
  externalId: string;
  title: string;
  location: string;
  url: string;
  description: string;
  publishedAt: Date | null;
  updatedOnly: boolean;
};

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 20000);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function locationOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  if (!record) return "";
  return text(record.name) || text(record.location) || text(record.city);
}

function dateOf(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseGreenhouse(payload: unknown): FetchedJob[] {
  const root = asRecord(payload);
  const jobs = list(root?.jobs ?? payload);
  return jobs.flatMap((item) => {
    const job = asRecord(item);
    if (!job) return [];
    const title = text(job.title);
    const url = text(job.absolute_url);
    if (!title || !url) return [];
    return [{
      externalId: String(job.id ?? url),
      title,
      location: locationOf(job.location),
      url,
      description: htmlToText(text(job.content)),
      publishedAt: dateOf(job.first_published) ?? dateOf(job.updated_at),
      updatedOnly: false,
    }];
  });
}

export function parseLever(payload: unknown): FetchedJob[] {
  return list(payload).flatMap((item) => {
    const job = asRecord(item);
    if (!job) return [];
    const title = text(job.text);
    const url = text(job.hostedUrl);
    if (!title || !url) return [];
    const categories = asRecord(job.categories);
    return [{
      externalId: text(job.id) || url,
      title,
      location: text(categories?.location),
      url,
      description: text(job.descriptionPlain) || htmlToText(text(job.description)),
      publishedAt: dateOf(job.createdAt),
      updatedOnly: false,
    }];
  });
}

export function parseAshby(payload: unknown): FetchedJob[] {
  const root = asRecord(payload);
  const jobs = list(root?.jobs ?? payload);
  return jobs.flatMap((item) => {
    const job = asRecord(item);
    if (!job) return [];
    const title = text(job.title);
    const url = text(job.jobUrl) || text(job.applyUrl);
    if (!title || !url) return [];
    return [{
      externalId: text(job.id) || url,
      title,
      location: locationOf(job.location) || text(job.locationName),
      url,
      description: text(job.descriptionPlain) || htmlToText(text(job.descriptionHtml) || text(job.description)),
      publishedAt: dateOf(job.publishedAt),
      updatedOnly: false,
    }];
  });
}

export function parseComeet(payload: unknown): FetchedJob[] {
  const root = asRecord(payload);
  const jobs = list(root?.positions ?? root?.jobs ?? payload);
  return jobs.flatMap((item) => {
    const job = asRecord(item);
    if (!job) return [];
    const title = text(job.name) || text(job.title);
    const url = text(job.url_comeet_hosted_page) || text(job.url) || text(job.position_url);
    if (!title || !url) return [];
    const published = dateOf(job.time_updated) ?? dateOf(job.time_created);
    return [{
      externalId: text(job.uid) || text(job.id) || url,
      title,
      location: locationOf(job.location),
      url,
      description: htmlToText(text(job.description) || text(job.details)),
      publishedAt: published,
      updatedOnly: true,
    }];
  });
}

export function parseWorkday(payload: unknown, careersUrl: string): FetchedJob[] {
  const root = asRecord(payload);
  const jobs = list(root?.jobPostings ?? root?.jobs);
  return jobs.flatMap((item) => {
    const job = asRecord(item);
    if (!job) return [];
    const title = text(job.title);
    const path = text(job.externalPath);
    if (!title || !path) return [];
    const base = careersUrl.replace(/\/$/, "");
    const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return [{
      externalId: path,
      title,
      location: text(job.locationsText) || locationOf(job.location),
      url,
      description: "",
      publishedAt: dateOf(job.postedOn) ?? null,
      updatedOnly: false,
    }];
  });
}

const LOCALE = /^(?:[a-z]{2}-[A-Z]{2}|[a-z]{2})$/;

function companyFromSlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function detectBoard(raw: string): DetectedBoard | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host.endsWith("greenhouse.io")) {
    const token = parts[0] === "embed" ? url.searchParams.get("for") : parts[0];
    if (!token || token === "jobs") return null;
    return {
      provider: "greenhouse",
      externalKey: token,
      careersUrl: `https://job-boards.greenhouse.io/${token}`,
      companyHint: companyFromSlug(token),
    };
  }

  if (host === "jobs.lever.co" && parts[0]) {
    return {
      provider: "lever",
      externalKey: parts[0],
      careersUrl: `https://jobs.lever.co/${parts[0]}`,
      companyHint: companyFromSlug(parts[0]),
    };
  }

  if (host === "jobs.ashbyhq.com" && parts[0]) {
    return {
      provider: "ashby",
      externalKey: parts[0],
      careersUrl: `https://jobs.ashbyhq.com/${parts[0]}`,
      companyHint: companyFromSlug(parts[0]),
    };
  }

  if (host === "comeet.com" || host === "comeet.co") {
    const jobsAt = parts[0] === "jobs" ? 1 : 0;
    const slug = parts[jobsAt];
    const uid = parts[jobsAt + 1];
    if (!slug || !uid) return null;
    return {
      provider: "comeet",
      externalKey: `${slug}/${uid}`,
      careersUrl: `https://www.comeet.com/jobs/${slug}/${uid}`,
      companyHint: companyFromSlug(slug),
    };
  }

  if (host.endsWith("myworkdayjobs.com")) {
    const site = parts.find((part) => !LOCALE.test(part));
    const tenant = host.split(".")[0];
    if (!site || !tenant) return null;
    return {
      provider: "workday",
      externalKey: `${host}|${tenant}|${site}`,
      careersUrl: `https://${host}/${site}`,
      companyHint: companyFromSlug(tenant),
    };
  }

  return null;
}

export function comeetUid(externalKey: string): string {
  const parts = externalKey.split("/").filter(Boolean);
  return parts[parts.length - 1] || externalKey;
}
