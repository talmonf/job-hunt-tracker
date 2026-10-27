"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { optionalInt, requiredText } from "../forms";
import { googleConfigured } from "../mail";
import { ensureCompany } from "../companies";
import { copyCompanyTags } from "../tag-assign";
import { recomputeJobStatus } from "../job-status";
import { detectBoard } from "../search/parse";
import { ensureCatalog } from "../search/store";
import { runSearchUntil } from "../search/run";

async function requireSearchUser() {
  const user = await requireUser();
  if (!user.jobSearchEnabled) redirect("/dashboard");
  return user;
}

function back(path: string, error: string): never {
  redirect(`${path}?error=${error}`);
}

export async function saveSearchSettings(formData: FormData) {
  const user = await requireSearchUser();
  const maxAgeDays = optionalInt(formData.get("maxAgeDays"), 90);
  if (maxAgeDays === "invalid" || maxAgeDays === null || maxAgeDays < 1) back("/opportunities/settings", "required");
  const data = {
    terms: String(formData.get("terms") ?? ""),
    excludedTitle: String(formData.get("excludedTitle") ?? ""),
    excludedDescription: String(formData.get("excludedDescription") ?? ""),
    maxAgeDays,
    hideJunior: formData.get("hideJunior") === "1",
    regionTelAviv: formData.get("regionTelAviv") === "1",
    regionSharon: formData.get("regionSharon") === "1",
    regionCenter: formData.get("regionCenter") === "1",
    regionJerusalem: formData.get("regionJerusalem") === "1",
    regionJudea: formData.get("regionJudea") === "1",
    regionSouth: formData.get("regionSouth") === "1",
    regionNorth: formData.get("regionNorth") === "1",
    extraPlaces: String(formData.get("extraPlaces") ?? ""),
    alertSenders: String(formData.get("alertSenders") ?? ""),
    confirmPhrases: String(formData.get("confirmPhrases") ?? ""),
    rejectPhrases: String(formData.get("rejectPhrases") ?? ""),
  };
  await prisma.searchSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  redirect("/opportunities/settings?updated=1");
}

export async function setSearchRule(formData: FormData) {
  const user = await requireSearchUser();
  const ruleKey = requiredText(formData.get("rule"));
  if (!ruleKey) redirect("/opportunities");
  const enabled = formData.get("enabled") === "1";
  await prisma.searchRule.upsert({
    where: { userId_ruleKey: { userId: user.id, ruleKey } },
    create: { userId: user.id, ruleKey, enabled },
    update: { enabled },
  });
  redirect("/opportunities");
}

export async function setBoardEnabled(formData: FormData) {
  const user = await requireSearchUser();
  const boardId = requiredText(formData.get("boardId"));
  if (!boardId) redirect("/opportunities/settings");
  await prisma.userBoard.updateMany({
    where: { userId: user.id, boardId },
    data: { enabled: formData.get("enabled") === "1" },
  });
  redirect("/opportunities/settings?updated=1");
}

export async function addBoard(formData: FormData) {
  const user = await requireSearchUser();
  const detected = detectBoard(requiredText(formData.get("url")));
  if (!detected) back("/opportunities/settings", "board");
  await ensureCatalog();
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
  await prisma.userBoard.upsert({
    where: { userId_boardId: { userId: user.id, boardId: board.id } },
    create: { userId: user.id, boardId: board.id, enabled: true },
    update: { enabled: true },
  });
  redirect("/opportunities/settings?updated=1");
}

const DECISIONS = ["dismissed", "hidden", "duplicate", "added", "applied"] as const;
type DecisionName = (typeof DECISIONS)[number];

function isDecision(value: string): value is DecisionName {
  return (DECISIONS as readonly string[]).includes(value);
}

export async function decidePosting(formData: FormData) {
  const user = await requireSearchUser();
  const source = formData.get("source") === "alert" ? "alert" : "board";
  const sourceId = requiredText(formData.get("sourceId"));
  const decision = requiredText(formData.get("decision"));
  if (!sourceId || !isDecision(decision)) redirect("/opportunities");
  const existing = await prisma.postingDecision.findUnique({ where: { userId_source_sourceId: { userId: user.id, source, sourceId } } });
  if (existing?.jobId && (decision === "added" || decision === "applied")) redirect(`/jobs/${existing.jobId}`);
  const jobId = decision === "added" || decision === "applied" ? await addTrackedJob(user.id, source, sourceId, decision === "applied") : existing?.jobId ?? undefined;
  await prisma.postingDecision.upsert({
    where: { userId_source_sourceId: { userId: user.id, source, sourceId } },
    create: { userId: user.id, source, sourceId, decision, jobId },
    update: { decision, jobId },
  });
  redirect("/opportunities?updated=1");
}

async function addTrackedJob(userId: string, source: "board" | "alert", sourceId: string, applied: boolean): Promise<string> {
  const posting = source === "board"
    ? await prisma.boardPosting.findFirst({ where: { id: sourceId }, include: { board: true } })
    : await prisma.alertPosting.findFirst({ where: { id: sourceId, userId } });
  if (!posting) redirect("/opportunities?error=required");
  const companyName = "board" in posting ? posting.board.companyName : posting.companyName;
  const company = await ensureCompany(prisma, userId, companyName);
  if (!company) redirect("/opportunities?error=required");
  const status = applied ? "applied" : "interest";
  const job = await prisma.job.create({
    data: {
      userId,
      companyId: company.id,
      companyName: company.name,
      title: posting.title,
      location: posting.location,
      description: "description" in posting ? posting.description : "",
      interestDate: new Date(),
      status,
    },
  });
  if (posting.url) await prisma.jobUrl.create({ data: { jobId: job.id, url: posting.url } });
  await prisma.event.create({
    data: {
      userId,
      jobId: job.id,
      type: applied ? "application" : "interest",
      occurredAt: new Date(),
      resultingStatus: status,
      summary: posting.title.slice(0, 500),
    },
  });
  await copyCompanyTags("job", job.id, [company.id]);
  await recomputeJobStatus(job.id);
  return job.id;
}

export async function restoreDecision(formData: FormData) {
  const user = await requireSearchUser();
  const id = requiredText(formData.get("id"));
  if (id) await prisma.postingDecision.deleteMany({ where: { id, userId: user.id, decision: { in: ["dismissed", "hidden", "duplicate"] } } });
  redirect("/opportunities?updated=1");
}

export async function searchNow() {
  const user = await requireSearchUser();
  await runSearchUntil(user.id, 45_000);
  redirect("/opportunities?updated=1");
}

export async function disconnectGmail() {
  const user = await requireSearchUser();
  await prisma.user.update({ where: { id: user.id }, data: { gmailRefreshToken: null, gmailEmail: null } });
  redirect("/opportunities/settings?updated=1");
}

export async function startGmailLink() {
  const user = await requireSearchUser();
  if (!googleConfigured()) redirect("/opportunities/settings?error=gmail");
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("gmail_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const redirectUri = `${process.env.AUTH_URL || "http://localhost:3000"}/api/google-gmail/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `${state}:${user.id}`);
  redirect(url.toString());
}
