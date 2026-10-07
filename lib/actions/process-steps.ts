"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { parseDateTime, requiredText } from "../forms";
import {
  CUSTOM_MEDIUM,
  isPresetMedium,
  PROCESS_LABEL_MAX,
  PROCESS_MEDIUM_MAX,
  PROCESS_NOTES_MAX,
  PROCESS_WITH_MAX,
} from "../process-steps";

function clip(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function processPath(jobId: string, notice?: "updated" | "required") {
  if (!notice) return `/jobs/${jobId}#process`;
  return `/jobs/${jobId}?${notice === "updated" ? "updated=1" : "error=required"}#process`;
}

async function ownedJob(userId: string, jobId: string) {
  if (!jobId) return null;
  return prisma.job.findFirst({ where: { id: jobId, userId }, select: { id: true } });
}

async function ownedStep(userId: string, stepId: string) {
  if (!stepId) return null;
  return prisma.jobProcessStep.findFirst({
    where: { id: stepId, job: { userId } },
    select: { id: true, jobId: true, completedAt: true },
  });
}

function readMedium(formData: FormData) {
  const selected = requiredText(formData.get("medium"));
  if (!selected) return "";
  if (selected === CUSTOM_MEDIUM) return clip(requiredText(formData.get("mediumCustom")), PROCESS_MEDIUM_MAX);
  if (isPresetMedium(selected)) return selected;
  return "";
}

function readFields(formData: FormData, timeZone: string) {
  return {
    label: clip(requiredText(formData.get("label")), PROCESS_LABEL_MAX),
    medium: readMedium(formData),
    withWhom: clip(requiredText(formData.get("withWhom")), PROCESS_WITH_MAX),
    notes: clip(String(formData.get("notes") ?? ""), PROCESS_NOTES_MAX),
    scheduledAt: parseDateTime(formData.get("scheduledAt"), timeZone),
  };
}

async function writePositions(jobId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.jobProcessStep.update({ where: { id }, data: { position: index + 1 } })),
  );
}

export async function addProcessStep(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  if (!job) redirect("/jobs?error=required");
  const fields = readFields(formData, user.timezone);
  if (!fields.label) redirect(processPath(job.id, "required"));
  const last = await prisma.jobProcessStep.aggregate({ where: { jobId: job.id }, _max: { position: true } });
  await prisma.jobProcessStep.create({
    data: { jobId: job.id, position: (last._max.position ?? 0) + 1, ...fields },
  });
  redirect(processPath(job.id, "updated"));
}

export async function updateProcessStep(formData: FormData) {
  const user = await requireUser();
  const step = await ownedStep(user.id, requiredText(formData.get("stepId")));
  if (!step) redirect("/jobs?error=required");
  const fields = readFields(formData, user.timezone);
  if (!fields.label) redirect(processPath(step.jobId, "required"));
  await prisma.jobProcessStep.update({ where: { id: step.id }, data: fields });
  redirect(processPath(step.jobId, "updated"));
}

export async function toggleProcessStep(formData: FormData) {
  const user = await requireUser();
  const step = await ownedStep(user.id, requiredText(formData.get("stepId")));
  if (!step) redirect("/jobs?error=required");
  const markDone = formData.get("done") === "1";
  await prisma.jobProcessStep.update({
    where: { id: step.id },
    data: { completedAt: markDone ? (step.completedAt ?? new Date()) : null },
  });
  redirect(processPath(step.jobId));
}

export async function moveProcessStep(formData: FormData) {
  const user = await requireUser();
  const step = await ownedStep(user.id, requiredText(formData.get("stepId")));
  if (!step) redirect("/jobs?error=required");
  const steps = await prisma.jobProcessStep.findMany({
    where: { jobId: step.jobId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const index = steps.findIndex((row) => row.id === step.id);
  const target = index + (formData.get("direction") === "down" ? 1 : -1);
  if (index < 0 || target < 0 || target >= steps.length) redirect(processPath(step.jobId));
  const ids = steps.map((row) => row.id);
  const current = ids[index];
  const neighbor = ids[target];
  if (current && neighbor) {
    ids[index] = neighbor;
    ids[target] = current;
    await writePositions(step.jobId, ids);
  }
  redirect(processPath(step.jobId));
}

export async function deleteProcessStep(formData: FormData) {
  const user = await requireUser();
  const step = await ownedStep(user.id, requiredText(formData.get("stepId")));
  if (!step) redirect("/jobs?error=required");
  const remaining = await prisma.jobProcessStep.findMany({
    where: { jobId: step.jobId, NOT: { id: step.id } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.jobProcessStep.delete({ where: { id: step.id } }),
    ...remaining.map((row, index) => prisma.jobProcessStep.update({ where: { id: row.id }, data: { position: index + 1 } })),
  ]);
  redirect(processPath(step.jobId, "updated"));
}
