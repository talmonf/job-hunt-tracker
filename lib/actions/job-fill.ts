"use server";

import type { TagColor } from "@prisma/client";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { createTag } from "./tags";
import { parseJsonObject } from "../ai/json";
import { JOB_DESCRIPTION_CLIP, jobDetailsSystem, normalizeJobDetails, type JobDetailFields } from "../ai/job-details";
import { AI_PROVIDERS, isAiProvider, platformKey, type AiProviderId } from "../ai/providers";
import { AiRunError, chargeAndComplete } from "../ai/run";
import { firstFreeTagColor } from "../tags";

export type FillJobError = "empty" | "aiKey" | "aiBalance" | "aiProvider";

export type FillJobResult =
  | { ok: true; fields: JobDetailFields; tagIds: string[]; proposedTags: string[] }
  | { ok: false; error: FillJobError };

export type ProposedTagResult =
  | { ok: true; tag: { id: string; name: string; color: TagColor } }
  | { ok: false; error: "required" | "tagName" };

async function resolveProvider(userId: string, paySource: "key" | "credits"): Promise<AiProviderId | null> {
  const [latest, keys] = await Promise.all([
    prisma.aiUsage.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { provider: true } }),
    prisma.aiProviderKey.findMany({ where: { userId }, select: { provider: true } }),
  ]);
  const saved = new Set(keys.map((row) => row.provider));
  const usable = (provider: AiProviderId) => (paySource === "key" ? saved.has(provider) : Boolean(platformKey(provider)));
  if (latest && isAiProvider(latest.provider) && usable(latest.provider)) return latest.provider;
  return AI_PROVIDERS.find(usable) ?? null;
}

export async function fillJobFromDescription(description: string): Promise<FillJobResult> {
  const user = await requireUser();
  const text = description.trim();
  if (!text) return { ok: false, error: "empty" };
  const paySource = user.aiPaySource === "credits" ? "credits" : "key";
  const provider = await resolveProvider(user.id, paySource);
  if (!provider) return { ok: false, error: paySource === "credits" ? "aiProvider" : "aiKey" };
  const tags = await prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  try {
    const completion = await chargeAndComplete({
      userId: user.id,
      paySource,
      provider,
      feature: "job-details",
      system: jobDetailsSystem(tags.map((tag) => tag.name)),
      user: text.slice(0, JOB_DESCRIPTION_CLIP),
      maxTokens: 800,
      outputEstimate: 400,
    });
    const parsed = parseJsonObject(completion.text);
    const normalized = normalizeJobDetails(parsed, tags);
    return { ok: true, ...normalized };
  } catch (error) {
    return { ok: false, error: error instanceof AiRunError ? error.code : "aiProvider" };
  }
}

export async function addProposedJobTag(name: string): Promise<ProposedTagResult> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "required" };
  const used = await prisma.tag.findMany({ where: { userId: user.id }, select: { color: true } });
  const formData = new FormData();
  formData.set("name", trimmed);
  formData.set("color", firstFreeTagColor(used.map((row) => row.color)));
  const created = await createTag(user.id, formData);
  if (created.ok) return created;
  if (created.error === "tagName") {
    const existing = await prisma.tag.findFirst({
      where: { userId: user.id, name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return { ok: true, tag: { id: existing.id, name: existing.name, color: existing.color } };
  }
  return { ok: false, error: created.error === "tagName" ? "tagName" : "required" };
}
