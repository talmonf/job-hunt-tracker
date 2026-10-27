import { comeetUid, parseAshby, parseComeet, parseGreenhouse, parseLever, parseWorkday, type FetchedJob } from "./parse";

export type BoardTarget = {
  provider: "greenhouse" | "lever" | "ashby" | "comeet" | "workday";
  externalKey: string;
  careersUrl: string;
};

const HEADERS = { accept: "application/json", "user-agent": "job-hunt-tracker" };

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { ...HEADERS, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function workdayParts(externalKey: string): { host: string; tenant: string; site: string } | null {
  const [host, tenant, site] = externalKey.split("|");
  if (!host || !tenant || !site) return null;
  return { host, tenant, site };
}

async function fetchWorkday(board: BoardTarget): Promise<FetchedJob[]> {
  const parts = workdayParts(board.externalKey);
  if (!parts) throw new Error("Workday board is missing a host");
  const jobs: FetchedJob[] = [];
  const cutoff = Date.now() - 14 * 86_400_000;
  for (let page = 0; page < 5; page += 1) {
    const payload = await getJson(`https://${parts.host}/wday/cxs/${parts.tenant}/${parts.site}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: page * 20, searchText: "" }),
    });
    const batch = parseWorkday(payload, board.careersUrl).filter((job) => {
      const place = job.location.toLowerCase();
      return place === "" || place.includes("israel") || place.includes("ישראל");
    });
    jobs.push(...batch);
    const dates = batch.map((job) => job.publishedAt?.getTime() ?? 0).filter((time) => time > 0);
    if (batch.length < 20 || (dates.length > 0 && Math.max(...dates) < cutoff)) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return jobs;
}

export async function fetchBoard(board: BoardTarget): Promise<{ jobs: FetchedJob[] } | { error: string }> {
  try {
    if (board.provider === "greenhouse") {
      const payload = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.externalKey)}/jobs?content=true`);
      return { jobs: parseGreenhouse(payload) };
    }
    if (board.provider === "lever") {
      const payload = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(board.externalKey)}?mode=json`);
      return { jobs: parseLever(payload) };
    }
    if (board.provider === "ashby") {
      const payload = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.externalKey)}`);
      return { jobs: parseAshby(payload) };
    }
    if (board.provider === "comeet") {
      const uid = comeetUid(board.externalKey);
      const payload = await getJson(`https://www.comeet.co/careers-api/2.0/company/${encodeURIComponent(uid)}/positions?details=true`);
      return { jobs: parseComeet(payload) };
    }
    return { jobs: await fetchWorkday(board) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return { error: message.slice(0, 300) };
  }
}
