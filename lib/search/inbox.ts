import { prisma } from "../prisma";
import { companyNameKey } from "../company-name";
import { parseCursor } from "./cursor";
import { ensureSearchSettings, ensureUserBoards, profileFrom } from "./store";
import { classifyInbox, sameOpening, type Candidate, type Freshness, type KnownJob, type Level, type RuleKey } from "./rules";

export type EarlierJob = { id: string; title: string; status: string };

export type OpportunityCard = {
  source: "board" | "alert";
  sourceId: string;
  company: string;
  title: string;
  location: string;
  url: string;
  level: Level;
  freshness: Freshness;
  waived: RuleKey[];
  reposted: boolean;
  earlier: EarlierJob[];
  officialUrl: string;
};

export type ReplyRow = {
  id: string;
  company: string;
  title: string;
  snippet: string;
  verdict: string;
  applied: boolean;
  jobId: string | null;
  messageAt: string | null;
};

const DECISION_LABELS = ["dismissed", "hidden", "duplicate", "added", "applied"] as const;

export async function loadInbox(userId: string) {
  await ensureUserBoards(userId);
  const settings = await ensureSearchSettings(userId);
  const [rules, links, decisions, jobs, alerts, replies, user] = await Promise.all([
    prisma.searchRule.findMany({ where: { userId }, select: { ruleKey: true, enabled: true } }),
    prisma.userBoard.findMany({
      where: { userId },
      include: { board: true },
      orderBy: { board: { companyName: "asc" } },
    }),
    prisma.postingDecision.findMany({ where: { userId } }),
    prisma.job.findMany({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        title: true,
        status: true,
        updatedAt: true,
        urls: { select: { url: true } },
        events: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
      },
    }),
    prisma.alertPosting.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.mailHit.findMany({ where: { userId, kind: "reply" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.user.findUnique({ where: { id: userId }, select: { searchCursor: true, searchRunAt: true, gmailEmail: true } }),
  ]);
  const enabledBoardIds = links.filter((link) => link.enabled).map((link) => link.boardId);
  const postings = enabledBoardIds.length
    ? await prisma.boardPosting.findMany({
        where: { boardId: { in: enabledBoardIds }, closedAt: null },
        include: { board: { select: { companyName: true } } },
      })
    : [];
  const disabledBoardIds = links.filter((link) => !link.enabled).map((link) => link.boardId);
  const disabledPostings = disabledBoardIds.length
    ? await prisma.boardPosting.findMany({
        where: { boardId: { in: disabledBoardIds }, closedAt: null },
        include: { board: { select: { companyName: true } } },
        take: 300,
      })
    : [];

  const decided = new Set(decisions.map((row) => `${row.source}:${row.sourceId}`));
  const profile = profileFrom(settings, rules.filter((rule) => !rule.enabled).map((rule) => rule.ruleKey));
  const known: KnownJob[] = jobs.map((job) => ({
    company: job.companyName,
    title: job.title,
    urls: job.urls.map((url) => url.url),
    lastActionAt: job.events[0]?.occurredAt ?? job.updatedAt,
  }));
  const now = new Date();

  const boardCandidates: Candidate[] = postings
    .filter((posting) => !decided.has(`board:${posting.id}`))
    .map((posting) => ({
      id: posting.id,
      company: posting.board.companyName,
      title: posting.title,
      location: posting.location,
      description: posting.description,
      url: posting.url,
      externalId: posting.externalId,
      publishedAt: posting.publishedAt,
      updatedOnly: posting.updatedOnly,
      israelAssumed: false,
    }));
  const boardInbox = classifyInbox(boardCandidates, profile, known, now);

  const official = postings.map((posting) => ({ company: posting.board.companyName, title: posting.title, url: posting.url }));
  const alertCandidates: Candidate[] = alerts
    .filter((alert) => !decided.has(`alert:${alert.id}`))
    .filter((alert) => !official.some((posting) => sameOpening({ company: alert.companyName, title: alert.title, url: alert.url }, posting)))
    .map((alert) => ({
      id: alert.id,
      company: alert.companyName,
      title: alert.title,
      location: alert.location,
      description: alert.description,
      url: alert.url,
      externalId: alert.externalId,
      publishedAt: alert.publishedAt,
      updatedOnly: false,
      israelAssumed: alert.externalId.startsWith("alljobs:") || alert.externalId.startsWith("drushim:"),
    }));
  const alertInbox = classifyInbox(alertCandidates, profile, known, now);

  const disabledCandidates: Candidate[] = disabledPostings.map((posting) => ({
    id: posting.id,
    company: posting.board.companyName,
    title: posting.title,
    location: posting.location,
    description: posting.description,
    url: posting.url,
    externalId: posting.externalId,
    publishedAt: posting.publishedAt,
    updatedOnly: posting.updatedOnly,
    israelAssumed: false,
  }));
  const disabledInbox = classifyInbox(disabledCandidates, profile, known, now);

  const byId = new Map<string, Candidate>([...boardCandidates, ...alertCandidates].map((candidate) => [candidate.id, candidate]));
  const earlierFor = (company: string): EarlierJob[] => {
    const key = companyNameKey(company);
    const rows = jobs.filter((job) => companyNameKey(job.companyName) === key);
    rows.sort((a, b) => (a.status === "rejected" ? -1 : 0) - (b.status === "rejected" ? -1 : 0));
    return rows.slice(0, 3).map((job) => ({ id: job.id, title: job.title, status: job.status }));
  };
  const toCard = (source: "board" | "alert", rowId: string, waived: RuleKey[], reposted: boolean, level: Level, freshness: Freshness): OpportunityCard | null => {
    const candidate = byId.get(rowId);
    if (!candidate) return null;
    const twin = source === "alert" ? official.find((posting) => sameOpening(candidate, posting)) : undefined;
    return {
      source,
      sourceId: rowId,
      company: candidate.company,
      title: candidate.title,
      location: candidate.location,
      url: candidate.url,
      level,
      freshness,
      waived,
      reposted,
      earlier: earlierFor(candidate.company),
      officialUrl: twin?.url ?? "",
    };
  };

  const cards = (source: "board" | "alert", inbox: typeof boardInbox) => ({
    visible: inbox.visible.flatMap((row) => {
      const card = toCard(source, row.id, row.waived, false, row.level, row.freshness);
      return card ? [card] : [];
    }),
    reposted: inbox.reposted.flatMap((row) => {
      const card = toCard(source, row.id, row.waived, true, row.level, row.freshness);
      return card ? [card] : [];
    }),
    counts: inbox.counts,
  });

  const hiddenDecisions = decisions.filter((row) => row.decision === "dismissed" || row.decision === "hidden" || row.decision === "duplicate");
  const decidedBoardIds = hiddenDecisions.filter((row) => row.source === "board").map((row) => row.sourceId);
  const decidedAlertIds = hiddenDecisions.filter((row) => row.source === "alert").map((row) => row.sourceId);
  const [decidedBoards, decidedAlerts] = await Promise.all([
    decidedBoardIds.length
      ? prisma.boardPosting.findMany({
          where: { id: { in: decidedBoardIds } },
          select: { id: true, title: true, board: { select: { companyName: true } } },
        })
      : [],
    decidedAlertIds.length
      ? prisma.alertPosting.findMany({
          where: { id: { in: decidedAlertIds } },
          select: { id: true, title: true, companyName: true },
        })
      : [],
  ]);
  const decisionLabel = new Map<string, string>();
  for (const row of decidedBoards) decisionLabel.set(`board:${row.id}`, `${row.board.companyName} — ${row.title}`);
  for (const row of decidedAlerts) decisionLabel.set(`alert:${row.id}`, `${row.companyName} — ${row.title}`);
  const decisionCounts = Object.fromEntries(DECISION_LABELS.map((kind) => [kind, decisions.filter((row) => row.decision === kind).length])) as Record<(typeof DECISION_LABELS)[number], number>;

  return {
    settings,
    rules,
    boards: links.map((link) => ({
      id: link.boardId,
      companyName: link.board.companyName,
      provider: link.board.provider,
      enabled: link.enabled,
      lastError: link.board.lastError,
      lastFetchedAt: link.board.lastFetchedAt?.toISOString() ?? "",
    })),
    career: cards("board", boardInbox),
    alerts: cards("alert", alertInbox),
    boardOff: disabledInbox.visible.length + disabledInbox.reposted.length,
    decisionCounts,
    decisions: hiddenDecisions.map((row) => ({
      id: row.id,
      decision: row.decision,
      label: decisionLabel.get(`${row.source}:${row.sourceId}`) || row.decision,
    })),
    replies: replies.map((reply): ReplyRow => ({
      id: reply.id,
      company: reply.companyName,
      title: reply.title,
      snippet: reply.snippet,
      verdict: reply.verdict,
      applied: reply.applied,
      jobId: reply.jobId,
      messageAt: reply.messageAt?.toISOString() ?? null,
    })),
    cursor: parseCursor(user?.searchCursor ?? ""),
    gmailEmail: user?.gmailEmail ?? "",
    hasTerms: profile.terms.length > 0,
  };
}
