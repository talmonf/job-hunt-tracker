"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAdmin, requireUser } from "../session";
import { encryptSecret } from "../crypto";
import { parseCareerDate, requiredText } from "../forms";
import { readStored } from "../files";
import { buildProposal } from "../ai/draft";
import { extractPdfText } from "../ai/pdf-text";
import { shekelsToAgorot } from "../ai/money";
import { DEFAULT_MODEL, isAiProvider, lastFour } from "../ai/providers";
import { isOutputLanguage, readProposalForm } from "../ai/proposal";
import { AiRunError, chargeAndComplete } from "../ai/run";
import { ensureCompany } from "../companies";
import { employmentNoteLabel, experienceNoteBodies } from "../notes";

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
  const provider = requiredText(formData.get("provider"));
  const paySource = formData.get("paySource") === "credits" ? "credits" : "key";
  const ids = formData.getAll("fileId").map((value) => String(value)).filter(Boolean);
  if (!isOutputLanguage(language) || !isAiProvider(provider) || ids.length === 0) redirect("/profile?error=required");
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
  await prisma.$transaction(async (tx) => {
    await tx.flavor.deleteMany({ where: { userId: user.id } });
    await tx.employment.deleteMany({ where: { userId: user.id } });
    await tx.education.deleteMany({ where: { userId: user.id } });
    await tx.volunteerRole.deleteMany({ where: { userId: user.id } });
    await tx.certificate.deleteMany({ where: { userId: user.id } });
    await tx.profileLabel.deleteMany({ where: { userId: user.id } });
    await tx.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, headline: proposal.headline, aboutEn: proposal.aboutEn, aboutHe: proposal.aboutHe },
      update: { headline: proposal.headline, aboutEn: proposal.aboutEn, aboutHe: proposal.aboutHe },
    });
    const employmentIds = new Map<string, string>();
    const bulletIds = new Map<string, string>();
    for (const row of proposal.employments) {
      const created = await tx.employment.create({
        data: {
          userId: user.id,
          title: row.title || row.company,
          company: row.company || row.title,
          startDate: parseCareerDate(row.startDate, user.timezone),
          endDate: row.isCurrent ? null : parseCareerDate(row.endDate, user.timezone),
          isCurrent: row.isCurrent,
          descriptionEn: row.bullets.map((bullet) => bullet.textEn).filter(Boolean).join("\n"),
          descriptionHe: row.bullets.map((bullet) => bullet.textHe).filter(Boolean).join("\n"),
          bullets: {
            create: row.bullets.map((bullet, position) => ({
              userId: user.id,
              position,
              textEn: bullet.textEn,
              textHe: bullet.textHe,
            })),
          },
        },
        include: { bullets: { orderBy: { position: "asc" } } },
      });
      employmentIds.set(row.key, created.id);
      if (row.createNote) {
        const title = employmentNoteLabel(row);
        if (title) {
          const bodies = experienceNoteBodies(row.bullets);
          await tx.note.create({
            data: {
              userId: user.id,
              title,
              type: "work_experience",
              employmentId: created.id,
              bodyEn: bodies.bodyEn,
              bodyHe: bodies.bodyHe,
            },
          });
        }
      }
      await ensureCompany(tx, user.id, row.company);
      row.bullets.forEach((bullet, position) => {
        const saved = created.bullets[position];
        if (saved) bulletIds.set(bullet.key, saved.id);
      });
    }
    for (const row of proposal.educations) {
      await tx.education.create({
        data: {
          userId: user.id,
          school: row.school,
          degree: row.degree,
          field: row.field,
          startDate: parseCareerDate(row.startDate, user.timezone),
          endDate: parseCareerDate(row.endDate, user.timezone),
        },
      });
    }
    for (const row of proposal.volunteers) {
      await tx.volunteerRole.create({
        data: {
          userId: user.id,
          organization: row.organization,
          role: row.role,
          startDate: parseCareerDate(row.startDate, user.timezone),
          endDate: parseCareerDate(row.endDate, user.timezone),
          descriptionEn: row.textEn,
          descriptionHe: row.textHe,
        },
      });
    }
    for (const row of proposal.certificates) {
      await tx.certificate.create({
        data: {
          userId: user.id,
          name: row.name,
          issuer: row.issuer,
          issuedOn: parseCareerDate(row.issuedOn, user.timezone),
          url: row.url,
        },
      });
    }
    const labelIds = new Map<string, string>();
    for (const row of proposal.labels) {
      const created = await tx.profileLabel.upsert({
        where: { userId_kind_name: { userId: user.id, kind: row.kind, name: row.name } },
        create: { userId: user.id, kind: row.kind, name: row.name },
        update: {},
      });
      labelIds.set(row.key, created.id);
    }
    for (const flavor of proposal.flavors) {
      await tx.flavor.create({
        data: {
          userId: user.id,
          name: flavor.name,
          employments: {
            create: flavor.employmentKeys
              .map((key) => employmentIds.get(key))
              .filter((value): value is string => Boolean(value))
              .map((employmentId) => ({ employmentId })),
          },
          bullets: {
            create: flavor.bulletKeys
              .map((key) => bulletIds.get(key))
              .filter((value): value is string => Boolean(value))
              .map((bulletId) => ({ bulletId })),
          },
          labels: {
            create: flavor.labelKeys
              .map((key) => labelIds.get(key))
              .filter((value): value is string => Boolean(value))
              .map((labelId) => ({ labelId })),
          },
        },
      });
    }
    await tx.profileImport.update({ where: { id: draft.id }, data: { status: "accepted", payload: proposal as unknown as Prisma.InputJsonValue } });
  });
  redirect("/profile?created=1");
}

export async function discardProfileImport(formData: FormData) {
  const user = await requireUser();
  await prisma.profileImport.updateMany({
    where: { id: requiredText(formData.get("draftId")), userId: user.id, status: "pending" },
    data: { status: "discarded" },
  });
  redirect("/profile?updated=1");
}
