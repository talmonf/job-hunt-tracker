import type { SearchSettings } from "@prisma/client";
import { prisma } from "../prisma";
import { STARTER_BOARDS } from "./catalog";
import { DEFAULT_CONFIRM, DEFAULT_REJECT, DEFAULT_SENDERS } from "./mail-parse";
import { detectBoard, type FetchedJob } from "./parse";
import { REGION_IDS, splitList, type RegionId, type SearchProfile } from "./rules";

const REGION_FIELD: Record<RegionId, keyof SearchSettings> = {
  telAviv: "regionTelAviv",
  sharon: "regionSharon",
  center: "regionCenter",
  jerusalem: "regionJerusalem",
  judea: "regionJudea",
  south: "regionSouth",
  north: "regionNorth",
};

export async function ensureCatalog() {
  const existing = await prisma.careerBoard.findMany({ select: { provider: true, externalKey: true } });
  const have = new Set(existing.map((board) => `${board.provider}:${board.externalKey}`));
  const missing = STARTER_BOARDS.filter((board) => !have.has(`${board.provider}:${board.externalKey}`));
  for (const board of missing) {
    await prisma.careerBoard.create({ data: board }).catch(() => undefined);
  }
}

export async function ensureSearchSettings(userId: string) {
  const existing = await prisma.searchSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.searchSettings.create({
    data: {
      userId,
      alertSenders: DEFAULT_SENDERS.join("\n"),
      confirmPhrases: DEFAULT_CONFIRM.join("\n"),
      rejectPhrases: DEFAULT_REJECT.join("\n"),
    },
  });
}

export async function ensureUserBoards(userId: string) {
  await ensureCatalog();
  const keys = STARTER_BOARDS.map((board) => board.externalKey);
  const [catalog, linked] = await Promise.all([
    prisma.careerBoard.findMany({ where: { externalKey: { in: keys } }, select: { id: true } }),
    prisma.userBoard.findMany({ where: { userId }, select: { boardId: true } }),
  ]);
  const have = new Set(linked.map((row) => row.boardId));
  const missing = catalog.filter((board) => !have.has(board.id));
  if (missing.length) {
    await prisma.userBoard.createMany({
      data: missing.map((board) => ({ userId, boardId: board.id, enabled: true })),
      skipDuplicates: true,
    });
  }
}

export async function discoverBoardsFromJobs(userId: string) {
  const urls = await prisma.jobUrl.findMany({ where: { job: { userId } }, select: { url: true } });
  for (const row of urls) {
    const detected = detectBoard(row.url);
    if (!detected) continue;
    const board = await prisma.careerBoard.upsert({
      where: { provider_externalKey: { provider: detected.provider, externalKey: detected.externalKey } },
      create: {
        provider: detected.provider,
        externalKey: detected.externalKey,
        companyName: detected.companyHint,
        careersUrl: detected.careersUrl,
      },
      update: {},
    });
    const link = await prisma.userBoard.findUnique({ where: { userId_boardId: { userId, boardId: board.id } } });
    if (!link) await prisma.userBoard.create({ data: { userId, boardId: board.id, enabled: true } });
  }
}

export async function syncPostings(boardId: string, jobs: readonly FetchedJob[]): Promise<number> {
  const now = new Date();
  const seen = new Set<string>();
  let created = 0;
  for (const job of jobs) {
    if (seen.has(job.externalId)) continue;
    seen.add(job.externalId);
    const existing = await prisma.boardPosting.findUnique({
      where: { boardId_externalId: { boardId, externalId: job.externalId } },
      select: { id: true },
    });
    const data = {
      title: job.title.slice(0, 300),
      location: job.location.slice(0, 300),
      url: job.url.slice(0, 1000),
      description: job.description,
      publishedAt: job.publishedAt,
      updatedOnly: job.updatedOnly,
      lastSeenAt: now,
      closedAt: null,
    };
    if (!existing) {
      await prisma.boardPosting.create({ data: { boardId, externalId: job.externalId, ...data } });
      created += 1;
    } else {
      await prisma.boardPosting.update({ where: { id: existing.id }, data });
    }
  }
  if (seen.size === 0) {
    await prisma.boardPosting.updateMany({ where: { boardId, closedAt: null }, data: { closedAt: now } });
  } else {
    await prisma.boardPosting.updateMany({
      where: { boardId, closedAt: null, externalId: { notIn: [...seen] } },
      data: { closedAt: now },
    });
  }
  return created;
}

export function profileFrom(settings: SearchSettings, disabledRules: readonly string[]): SearchProfile {
  return {
    terms: splitList(settings.terms),
    excludedTitle: splitList(settings.excludedTitle),
    excludedDescription: splitList(settings.excludedDescription),
    maxAgeDays: settings.maxAgeDays,
    hideJunior: settings.hideJunior,
    regionsOff: REGION_IDS.filter((id) => settings[REGION_FIELD[id]] === false),
    extraPlaces: splitList(settings.extraPlaces),
    disabledRules: new Set(disabledRules),
  };
}

export async function loadProfile(userId: string): Promise<SearchProfile> {
  const [settings, rules] = await Promise.all([
    ensureSearchSettings(userId),
    prisma.searchRule.findMany({ where: { userId, enabled: false }, select: { ruleKey: true } }),
  ]);
  return profileFrom(settings, rules.map((rule) => rule.ruleKey));
}
