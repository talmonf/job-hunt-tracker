import { prisma } from "../prisma";
import { recomputeJobStatus } from "../job-status";
import { fetchBoard } from "./fetch";
import { gmailAccess, listMessageIds, readMessage } from "./gmail";
import { classifyReply, extractReplyTarget, linesOrDefault, parseAlertHtml, DEFAULT_CONFIRM, DEFAULT_REJECT, DEFAULT_SENDERS } from "./mail-parse";
import { parseCursor, type SearchCursor } from "./cursor";
import { discoverBoardsFromJobs, ensureUserBoards, loadProfile, syncPostings } from "./store";
import { matchKnownJob, replyShouldApply, searchIsDue } from "./rules";

const CHUNK = 8;
const FRESH_MS = 2 * 60 * 60 * 1000;
const LOCK_MS = 90_000;

function emptyCursor(force: boolean): SearchCursor {
  return {
    phase: "boards",
    index: 0,
    force,
    stats: { boardsOk: 0, boardsFailed: 0, newPostings: 0, mailRead: 0, repliesApplied: 0, repliesUnmatched: 0 },
    startedAt: new Date().toISOString(),
  };
}

async function saveCursor(userId: string, cursor: SearchCursor, finished: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      searchCursor: JSON.stringify(cursor),
      searchRunAt: finished ? new Date() : undefined,
      searchLockedAt: null,
    },
  });
}

export async function runSearchChunk(userId: string, opts: { force: boolean }): Promise<{ done: boolean; skipped: boolean; cursor: SearchCursor | null }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.jobSearchEnabled) return { done: true, skipped: true, cursor: null };
  const existing = parseCursor(user.searchCursor);
  const due = searchIsDue({
    jobSearchEnabled: true,
    timeZone: user.timezone,
    lastRunAt: user.searchRunAt,
    phase: existing?.phase ?? null,
    now: new Date(),
  });
  if (!opts.force && !due) return { done: true, skipped: true, cursor: existing };

  const locked = await prisma.user.updateMany({
    where: {
      id: userId,
      jobSearchEnabled: true,
      OR: [{ searchLockedAt: null }, { searchLockedAt: { lt: new Date(Date.now() - LOCK_MS) } }],
    },
    data: { searchLockedAt: new Date() },
  });
  if (locked.count !== 1) return { done: false, skipped: true, cursor: existing };

  let cursor = existing && existing.phase !== "done" ? existing : emptyCursor(opts.force);
  if (opts.force && existing?.phase === "done") cursor = emptyCursor(true);

  try {
    if (cursor.phase === "boards") {
      await ensureUserBoards(userId);
      if (cursor.index === 0) await discoverBoardsFromJobs(userId);
      const boards = await prisma.userBoard.findMany({
        where: { userId, enabled: true },
        include: { board: true },
        orderBy: { board: { companyName: "asc" } },
      });
      const slice = boards.slice(cursor.index, cursor.index + CHUNK);
      for (const link of slice) {
        const fresh = link.board.lastFetchedAt && Date.now() - link.board.lastFetchedAt.getTime() < FRESH_MS;
        if (fresh && !cursor.force) {
          cursor.stats.boardsOk += 1;
          continue;
        }
        const result = await fetchBoard(link.board);
        if ("error" in result) {
          cursor.stats.boardsFailed += 1;
          await prisma.careerBoard.update({ where: { id: link.board.id }, data: { lastError: result.error, lastFetchedAt: new Date() } });
        } else {
          const created = await syncPostings(link.board.id, result.jobs);
          cursor.stats.boardsOk += 1;
          cursor.stats.newPostings += created;
          await prisma.careerBoard.update({ where: { id: link.board.id }, data: { lastError: "", lastFetchedAt: new Date() } });
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      cursor.index += slice.length;
      if (cursor.index >= boards.length) {
        cursor.phase = "mail";
        cursor.index = 0;
      }
    } else if (cursor.phase === "mail") {
      await readMailbox(userId, cursor);
      cursor.phase = "done";
      cursor.finishedAt = new Date().toISOString();
    }

    const finished = cursor.phase === "done";
    await saveCursor(userId, cursor, finished);
    return { done: finished, skipped: false, cursor };
  } catch (error) {
    await prisma.user.update({ where: { id: userId }, data: { searchLockedAt: null } });
    throw error;
  }
}

async function readMailbox(userId: string, cursor: SearchCursor) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmailRefreshToken) return;
  const token = await gmailAccess(user.gmailRefreshToken);
  if (!token) {
    cursor.mailError = "refresh";
    return;
  }
  const settings = await prisma.searchSettings.findUnique({ where: { userId } });
  const senders = linesOrDefault(settings?.alertSenders ?? "", DEFAULT_SENDERS);
  const confirm = linesOrDefault(settings?.confirmPhrases ?? "", DEFAULT_CONFIRM);
  const reject = linesOrDefault(settings?.rejectPhrases ?? "", DEFAULT_REJECT);
  const from = senders.map((sender) => `from:${sender}`).join(" OR ");
  const phraseQuery = [...confirm.slice(0, 4), ...reject.slice(0, 3)].map((phrase) => `"${phrase}"`).join(" OR ");
  const [alerts, replies] = await Promise.all([
    listMessageIds(token, `newer_than:2d (${from})`),
    listMessageIds(token, `newer_than:14d (${phraseQuery})`),
  ]);
  if ("error" in alerts) cursor.mailError = alerts.error;
  else if ("error" in replies) cursor.mailError = replies.error;
  const ids = [...new Set([
    ...("error" in alerts ? [] : alerts.ids),
    ...("error" in replies ? [] : replies.ids),
  ])];
  const jobs = await prisma.job.findMany({ where: { userId }, select: { id: true, companyName: true, title: true, status: true } });
  for (const id of ids) {
    const seen = await prisma.mailHit.findUnique({ where: { userId_gmailId: { userId, gmailId: id } }, select: { id: true } });
    if (seen) continue;
    const message = await readMessage(token, id);
    if (!message) continue;
    cursor.stats.mailRead += 1;
    const blob = `${message.subject}\n${message.text || message.snippet}`;
    const verdict = classifyReply(blob, confirm, reject);
    const fromKnown = senders.some((sender) => message.from.toLowerCase().includes(sender.toLowerCase()));
    const parsed = fromKnown ? parseAlertHtml({ from: message.from, html: message.html || message.text }) : [];
    if (parsed.length) {
      const hit = await prisma.mailHit.create({
        data: {
          userId,
          gmailId: id,
          kind: "alert",
          snippet: message.snippet.slice(0, 500),
          messageAt: message.date,
          verdict: parsed.length ? "stored" : "empty",
        },
      });
      for (const job of parsed) {
        await prisma.alertPosting.upsert({
          where: { userId_externalId: { userId, externalId: job.externalId } },
          create: {
            userId,
            mailHitId: hit.id,
            externalId: job.externalId,
            companyName: job.company || "Unknown",
            title: job.title,
            location: job.location,
            url: job.url,
            publishedAt: message.date,
          },
          update: { title: job.title, companyName: job.company || "Unknown", url: job.url, mailHitId: hit.id },
        });
      }
    } else if (verdict) {
      await storeReply(userId, message, verdict, jobs);
    }
  }
  const appliedCount = await prisma.mailHit.count({ where: { userId, kind: "reply", applied: true, createdAt: { gte: new Date(cursor.startedAt) } } });
  const unmatchedCount = await prisma.mailHit.count({ where: { userId, kind: "reply", verdict: "unmatched", createdAt: { gte: new Date(cursor.startedAt) } } });
  cursor.stats.repliesApplied = appliedCount;
  cursor.stats.repliesUnmatched = unmatchedCount;
}

async function storeReply(
  userId: string,
  message: { id: string; subject: string; snippet: string; date: Date | null; text: string },
  verdict: "applied" | "rejected",
  jobs: { id: string; companyName: string; title: string; status: "interest" | "contacted" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn" | "on_hold" | "parked" | "not_applicable" }[],
) {
  const target = extractReplyTarget(message.subject, message.text);
  const job = matchKnownJob(target.company, target.title, jobs);
  const messageAt = message.date ?? new Date();
  if (!job) {
    await prisma.mailHit.create({
      data: {
        userId,
        gmailId: message.id,
        kind: "reply",
        companyName: target.company,
        title: target.title,
        snippet: message.snippet.slice(0, 500),
        verdict: "unmatched",
        messageAt,
      },
    });
    return;
  }
  const latest = await prisma.event.findFirst({
    where: { jobId: job.id, resultingStatus: { not: null } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
  const apply = replyShouldApply(messageAt, latest?.occurredAt ?? null);
  const status = verdict === "applied" ? "applied" : "rejected";
  if (apply) {
    const importKey = `gmail:${message.id}`;
    const existing = await prisma.event.findUnique({ where: { userId_importKey: { userId, importKey } }, select: { id: true } });
    if (!existing) {
      await prisma.event.create({
        data: {
          userId,
          jobId: job.id,
          type: "status_change",
          occurredAt: messageAt,
          resultingStatus: status,
          previousStatus: job.status,
          summary: message.subject.slice(0, 500),
          importKey,
        },
      });
      await recomputeJobStatus(job.id);
    }
  }
  await prisma.mailHit.create({
    data: {
      userId,
      gmailId: message.id,
      kind: "reply",
      companyName: target.company || job.companyName,
      title: target.title || job.title,
      snippet: message.snippet.slice(0, 500),
      verdict: apply ? status : "skipped",
      applied: apply,
      jobId: job.id,
      messageAt,
    },
  });
}

export async function runSearchUntil(userId: string, budgetMs: number): Promise<SearchCursor | null> {
  const started = Date.now();
  let last: SearchCursor | null = null;
  do {
    const chunk = await runSearchChunk(userId, { force: true });
    last = chunk.cursor;
    if (chunk.done || chunk.skipped) break;
  } while (Date.now() - started < budgetMs);
  return last;
}

export async function runDueSearch(): Promise<{ userId: string | null; done: boolean }> {
  const users = await prisma.user.findMany({
    where: { jobSearchEnabled: true, isActive: true },
    select: { id: true, timezone: true, searchRunAt: true, searchCursor: true },
    orderBy: { searchRunAt: "asc" },
  });
  const now = new Date();
  const next = users.find((user) => {
    const cursor = parseCursor(user.searchCursor);
    return searchIsDue({
      jobSearchEnabled: true,
      timeZone: user.timezone,
      lastRunAt: user.searchRunAt,
      phase: cursor?.phase ?? null,
      now,
    });
  });
  if (!next) return { userId: null, done: true };
  const chunk = await runSearchChunk(next.id, { force: false });
  return { userId: next.id, done: chunk.done };
}
