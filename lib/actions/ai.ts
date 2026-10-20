"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAdmin, requireUser } from "../session";
import { encryptSecret } from "../crypto";
import { requiredText } from "../forms";
import { readStored } from "../files";
import { planProfileImport, resolveSkillTags } from "../ai/accept-profile";
import { buildProposal } from "../ai/draft";
import { extractPdfText } from "../ai/pdf-text";
import { shekelsToAgorot } from "../ai/money";
import { resolveSponsoredProvider } from "../ai/feature-grants";
import { DEFAULT_MODEL, isAiProvider, lastFour } from "../ai/providers";
import { isOutputLanguage, readProposalForm } from "../ai/proposal";
import { AiRunError, chargeAndComplete } from "../ai/run";
import { ensureCompanies } from "../companies";

export async function saveProviderKey(formData: FormData) {
  const user = await requireUser();
  const provider = requiredText(formData.get("provider"));
  if (!isAiProvider(provider)) redirect("/settings?error=aiProvider");
  const model = requiredText(formData.get("model")) || DEFAULT_MODEL[provider];
  const secret = String(formData.get("apiKey") ?? "").trim();
  const existing = await prisma.aiProviderKey.findUnique({ where: { userId_provider: { userId: user.id, provider } } });
  if (!secret && !existing) redirect("/settings?error=aiKey");
  if (secret) {
    await prisma.aiProviderKey.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      create: { userId: user.id, provider, ciphertext: encryptSecret(secret), lastFour: lastFour(secret), model },
      update: { ciphertext: encryptSecret(secret), lastFour: lastFour(secret), model },
    });
  } else if (existing) {
    await prisma.aiProviderKey.update({ where: { id: existing.id }, data: { model } });
  }
  redirect("/settings?updated=1");
}

export async function deleteProviderKey(formData: FormData) {
  const user = await requireUser();
  const provider = requiredText(formData.get("provider"));
  if (!isAiProvider(provider)) redirect("/settings?error=aiProvider");
  await prisma.aiProviderKey.deleteMany({ where: { userId: user.id, provider } });
  redirect("/settings?updated=1");
}

export async function testProviderKey(formData: FormData) {
  const user = await requireUser();
  const provider = requiredText(formData.get("provider"));
  const paySource = formData.get("paySource") === "credits" ? "credits" : "key";
  if (!isAiProvider(provider)) redirect("/settings?error=aiProvider");
  try {
    await chargeAndComplete({
      userId: user.id,
      paySource,
      provider,
      feature: "test",
      system: "Reply with the word OK.",
      user: "Reply with OK.",
      maxTokens: 16,
      outputEstimate: 8,
    });
  } catch (error) {
    redirect(`/settings?error=${error instanceof AiRunError ? error.code : "aiProvider"}`);
  }
  redirect("/settings?created=1");
}

export async function savePaySource(formData: FormData) {
  const user = await requireUser();
  const aiPaySource = formData.get("paySource") === "credits" ? "credits" : "key";
  await prisma.user.update({ where: { id: user.id }, data: { aiPaySource } });
  redirect("/settings?updated=1");
}

export async function savePlatformPricing(formData: FormData) {
  await requireAdmin();
  const markup = Number(formData.get("markupPercent"));
  const usdToIls = Number(String(formData.get("usdToIls") ?? "").replace(",", "."));
  if (!Number.isInteger(markup) || markup < 0 || markup > 500 || !Number.isFinite(usdToIls) || usdToIls <= 0) {
    redirect("/settings?error=required");
  }
  await prisma.aiPlatform.upsert({
    where: { id: "default" },
    create: { id: "default", markupPercent: markup, usdToIls },
    update: { markupPercent: markup, usdToIls },
  });
  redirect("/settings?updated=1");
}

export async function saveCreditPack(formData: FormData) {
  await requireAdmin();
  const nameEn = requiredText(formData.get("nameEn"));
  const nameHe = requiredText(formData.get("nameHe")) || nameEn;
  const creditAgorot = shekelsToAgorot(String(formData.get("creditIls") ?? ""));
  const priceAgorot = shekelsToAgorot(String(formData.get("priceIls") ?? ""));
  if (!nameEn || creditAgorot == null || priceAgorot == null) redirect("/settings?error=required");
  const id = requiredText(formData.get("id"));
  const data = { nameEn, nameHe, creditAgorot, priceAgorot, active: formData.get("active") === "1" };
  if (id) {
    await prisma.creditPack.updateMany({ where: { id }, data });
  } else {
    await prisma.creditPack.create({ data });
  }
  redirect("/settings?updated=1");
}

export async function deleteCreditPack(formData: FormData) {
  await requireAdmin();
  await prisma.creditPack.deleteMany({ where: { id: requiredText(formData.get("id")) } });
  redirect("/settings?updated=1");
}

export async function grantCredits(formData: FormData) {
  const admin = await requireAdmin();
  const id = requiredText(formData.get("id"));
  const agorot = shekelsToAgorot(String(formData.get("amountIls") ?? ""));
  if (!id || agorot == null) redirect("/admin/users?error=required");
  const note = requiredText(formData.get("note")) || `Granted by ${admin.email}`;
  const updated = await prisma.user.updateMany({
    where: { id },
    data: { creditBalance: { increment: agorot } },
  });
  if (updated.count !== 1) redirect("/admin/users?error=required");
  await prisma.creditLedger.create({ data: { userId: id, delta: agorot, kind: "grant", note } });
  redirect("/admin/users?updated=1");
}

export async function startCreditCheckout(formData: FormData) {
  const user = await requireUser();
  const pack = await prisma.creditPack.findFirst({ where: { id: requiredText(formData.get("packId")), active: true } });
  if (!pack) redirect("/settings?error=required");
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const origin = (process.env.AUTH_URL || "").replace(/\/$/, "");
  if (!secret || !origin) redirect("/settings?error=stripe");
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, credits: String(pack.creditAgorot), packId: pack.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "ils",
          unit_amount: pack.priceAgorot,
          product_data: { name: user.uiLanguage === "he" ? pack.nameHe : pack.nameEn },
        },
      },
    ],
    success_url: `${origin}/settings?created=1`,
    cancel_url: `${origin}/settings`,
  });
  if (!session.url) redirect("/settings?error=stripe");
  redirect(session.url);
}

export async function prepareProfileImport(formData: FormData) {
  const user = await requireUser();
  const language = requiredText(formData.get("language"));
  const requestedProvider = requiredText(formData.get("provider"));
  const requestedPay = formData.get("paySource") === "credits" ? "credits" : "key";
  const ids = formData.getAll("fileId").map((value) => String(value)).filter(Boolean);
  if (!isOutputLanguage(language) || !isAiProvider(requestedProvider) || ids.length === 0) redirect("/profile?error=required");
  const files = await prisma.profileFile.findMany({ where: { userId: user.id, id: { in: ids } } });
  if (files.length !== ids.length) redirect("/profile?error=required");
  const texts: { filename: string; text: string }[] = [];
  for (const file of files) {
    let text = file.extractedText.trim();
    if (!text) {
      if (file.mime !== "application/pdf" && !file.filename.toLowerCase().endsWith(".pdf")) redirect("/profile?error=aiPdf");
      const bytes = await readStored(user.id, file.objectKey);
      if (!bytes) redirect("/profile?error=storage");
      try {
        text = await extractPdfText(bytes);
      } catch {
        redirect("/profile?error=aiPdf");
      }
      if (!text) redirect("/profile?error=aiPdf");
      await prisma.profileFile.update({ where: { id: file.id }, data: { extractedText: text } });
    }
    texts.push({ filename: file.filename, text });
  }
  const feature = texts.length > 1 ? "compare" : "import";
  const sponsored = await resolveSponsoredProvider(user.id, feature);
  const paySource = sponsored ? "sponsored" : requestedPay;
  const provider = sponsored ?? requestedProvider;
  let proposal;
  try {
    proposal = await buildProposal({ userId: user.id, texts, language, paySource, provider });
  } catch (error) {
    redirect(`/profile?error=${error instanceof AiRunError ? error.code : "aiProvider"}`);
  }
  await prisma.profileImport.updateMany({ where: { userId: user.id, status: "pending" }, data: { status: "discarded" } });
  const draft = await prisma.profileImport.create({
    data: { userId: user.id, payload: proposal as unknown as Prisma.InputJsonValue },
  });
  redirect(`/profile?draft=${draft.id}`);
}

export async function acceptProfileImport(formData: FormData) {
  const user = await requireUser();
  const id = requiredText(formData.get("draftId"));
  const draft = await prisma.profileImport.findFirst({ where: { id, userId: user.id, status: "pending" } });
  if (!draft) redirect("/profile?error=required");
  const proposal = readProposalForm(formData);
  const plan = planProfileImport(user.id, proposal, user.timezone);
  // A LinkedIn export is one row per job, school, certificate, and skill. Writing those one query at a
  // time outlives Prisma's 5s interactive transaction, and the next note insert fails with P2028.
  await prisma.$transaction(
    async (tx) => {
      await tx.employment.deleteMany({ where: { userId: user.id } });
      await tx.education.deleteMany({ where: { userId: user.id } });
      await tx.volunteerRole.deleteMany({ where: { userId: user.id } });
      await tx.certificate.deleteMany({ where: { userId: user.id } });
      const profile = await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, headline: proposal.headline, aboutEn: proposal.aboutEn, aboutHe: proposal.aboutHe },
        update: { headline: proposal.headline, aboutEn: proposal.aboutEn, aboutHe: proposal.aboutHe },
      });
      await createMany(plan.employments, (data) => tx.employment.createMany({ data }));
      await createMany(plan.bullets, (data) => tx.employmentBullet.createMany({ data }));
      await createMany(plan.notes, (data) => tx.note.createMany({ data }));
      await ensureCompanies(tx, user.id, plan.companies);
      await createMany(plan.educations, (data) => tx.education.createMany({ data }));
      await createMany(plan.volunteers, (data) => tx.volunteerRole.createMany({ data }));
      await createMany(plan.certificates, (data) => tx.certificate.createMany({ data }));
      const existingTags = await tx.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true, color: true } });
      const skills = resolveSkillTags(plan.skillNames, existingTags);
      await createMany(skills.create, (data) => tx.tag.createMany({ data: data.map((tag) => ({ ...tag, userId: user.id })) }));
      await tx.profileTag.deleteMany({ where: { profileId: profile.id } });
      await createMany(skills.tagIds, (data) => tx.profileTag.createMany({ data: data.map((tagId) => ({ profileId: profile.id, tagId })) }));
      await tx.profileImport.update({
        where: { id: draft.id },
        data: { status: "accepted", payload: proposal as unknown as Prisma.InputJsonValue },
      });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  redirect("/profile?created=1#tags");
}

async function createMany<T>(rows: readonly T[], write: (data: T[]) => Promise<unknown>) {
  if (rows.length) await write([...rows]);
}

export async function discardProfileImport(formData: FormData) {
  const user = await requireUser();
  await prisma.profileImport.updateMany({
    where: { id: requiredText(formData.get("draftId")), userId: user.id, status: "pending" },
    data: { status: "discarded" },
  });
  redirect("/profile?updated=1");
}
