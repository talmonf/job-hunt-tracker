import { prisma } from "../prisma";
import { decryptSecret } from "../crypto";
import { completeText, estimateTokens, type Completion } from "./call";
import { creditDebitAgorot, providerCostAgorot, providerCostUsdMicros } from "./money";
import { hasFeatureGrant } from "./feature-grants";
import { isSponsoredFeature } from "./feature-access";
import { hasPlatformGrant } from "./platform-access";
import { DEFAULT_MODEL, modelPrice, platformKey, type AiProviderId } from "./providers";

export class AiRunError extends Error {
  constructor(readonly code: "aiKey" | "aiBalance" | "aiProvider" | "aiGrant") {
    super(code);
  }
}

export async function chargeAndComplete(input: {
  userId: string;
  paySource: "key" | "credits" | "sponsored";
  provider: AiProviderId;
  feature: string;
  system: string;
  user: string;
  maxTokens: number;
  outputEstimate: number;
}): Promise<Completion> {
  const platform = await prisma.aiPlatform.findUnique({ where: { id: "default" } });
  const usdToIls = platform?.usdToIls ?? 3.7;
  const markupPercent = platform?.markupPercent ?? 20;
  const saved = await prisma.aiProviderKey.findUnique({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
  });
  if (input.paySource === "credits" && !(await hasPlatformGrant(input.userId, input.provider))) {
    throw new AiRunError("aiGrant");
  }
  if (input.paySource === "sponsored" && (!isSponsoredFeature(input.feature) || !(await hasFeatureGrant(input.userId, input.feature)))) {
    throw new AiRunError("aiGrant");
  }
  const apiKey = input.paySource === "key" ? (saved ? decryptSecret(saved.ciphertext) : null) : platformKey(input.provider);
  if (!apiKey) throw new AiRunError(input.paySource === "key" ? "aiKey" : "aiProvider");
  const model = input.paySource === "key" && saved?.model ? saved.model : DEFAULT_MODEL[input.provider];
  const estimate = estimateTokens(`${input.system}\n${input.user}`, input.outputEstimate);
  const price = modelPrice(model);
  const estimatedProvider = providerCostAgorot({ ...estimate, ...price, usdToIls });
  const estimatedDebit = input.paySource === "credits" ? creditDebitAgorot(estimatedProvider, markupPercent) : 0;
  const held = estimatedDebit > 0 ? await holdCredits(input.userId, estimatedDebit) : false;
  if (estimatedDebit > 0 && !held) throw new AiRunError("aiBalance");
  try {
    const completion = await completeText({
      provider: input.provider,
      apiKey,
      model,
      system: input.system,
      user: input.user,
      maxTokens: input.maxTokens,
      json: input.feature !== "test",
    });
    const actualPrice = modelPrice(completion.model);
    const actualProvider = providerCostAgorot({
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      ...actualPrice,
      usdToIls,
    });
    const actualDebit = input.paySource === "credits" ? creditDebitAgorot(actualProvider, markupPercent) : 0;
    const debitAgorot = held ? await settleCredits(input.userId, estimatedDebit, actualDebit) : 0;
    await prisma.aiUsage.create({
      data: {
        userId: input.userId,
        feature: input.feature,
        provider: input.provider,
        model: completion.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        paySource: input.paySource,
        estimatedAgorot: actualProvider,
        debitAgorot,
        costUsdMicros: providerCostUsdMicros({
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          ...actualPrice,
        }),
      },
    });
    if (input.paySource !== "sponsored") {
      await prisma.user.update({ where: { id: input.userId }, data: { aiPaySource: input.paySource } });
    }
    return completion;
  } catch (error) {
    if (held) await releaseCredits(input.userId, estimatedDebit);
    if (error instanceof AiRunError) throw error;
    throw new AiRunError("aiProvider");
  }
}

async function holdCredits(userId: string, amount: number): Promise<boolean> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, creditBalance: { gte: amount } },
    data: { creditBalance: { decrement: amount } },
  });
  return updated.count === 1;
}

async function releaseCredits(userId: string, amount: number) {
  await prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: amount } } });
}

async function settleCredits(userId: string, held: number, actual: number): Promise<number> {
  let debited = held;
  if (actual < held) {
    await prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: held - actual } } });
    debited = actual;
  } else if (actual > held) {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
    const extra = Math.min(row?.creditBalance ?? 0, actual - held);
    if (extra > 0) {
      await prisma.user.update({ where: { id: userId }, data: { creditBalance: { decrement: extra } } });
      debited = held + extra;
    }
  }
  if (debited > 0) {
    await prisma.creditLedger.create({
      data: { userId, delta: -debited, kind: "debit", note: "" },
    });
  }
  return debited;
}
