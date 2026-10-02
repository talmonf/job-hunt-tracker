"use server";

import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { optionalInt, parseDateOnly, parseDateTime, requiredText } from "../forms";
import { EMPLOYMENT_TYPES, ENGAGEMENTS, WORK_ARRANGEMENTS } from "../events";
import { recomputeJobStatus } from "../job-status";
import { removeStored, saveUpload } from "../files";
import { deleteCalendarEvent } from "../calendar";
import { replaceRecordTags } from "../tag-assign";
import { persistEvent } from "../event-write";

export async function createJob(formData: FormData) {
  const user = await requireUser();
  const companyName = requiredText(formData.get("companyName"));
  const title = requiredText(formData.get("title"));
  const description = String(formData.get("description") ?? "");
  const interestDate = parseDateOnly(formData.get("interestDate"), user.timezone);
  if (!companyName || !interestDate) redirect(back(formData, "/jobs", "required"));
  const followUpAt = parseDateTime(formData.get("followUpAt"), user.timezone);
  const reminder = readReminder(formData);
  if (reminder === "invalid") redirect(back(formData, "/jobs", "required"));
  const job = await prisma.job.create({
    data: {
      userId: user.id,
      companyName,
      title,
      ...readJobAttributes(formData),
      description,
      interestDate,
      followUpAt,
      reminderLeadDays: reminder.days,
      reminderLeadHours: reminder.hours,
      status: "interest",
    },
  });
  const urls = readUrls(formData);
  if (urls.length) {
    await prisma.jobUrl.createMany({
      data: urls.map((url) => ({ jobId: job.id, url })),
    });
  }
  await prisma.event.create({
    data: {
      userId: user.id,
      jobId: job.id,
      type: "interest",
      occurredAt: interestDate,
      resultingStatus: "interest",
      summary: description.slice(0, 500),
    },
  });
  await replaceRecordTags("job", job.id, user.id, formData);
  redirect("/jobs?created=1");
}

export async function updateJob(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  if (!job) redirect("/jobs?error=required");
  const companyName = requiredText(formData.get("companyName"));
  const interestDate = parseDateOnly(formData.get("interestDate"), user.timezone);
  const followUpAt = parseDateTime(formData.get("followUpAt"), user.timezone);
  if (!companyName || !interestDate) redirect(`/jobs/${job.id}?error=required`);
  const reminder = readReminder(formData);
  if (reminder === "invalid") redirect(`/jobs/${job.id}?error=required`);
  const reminderChanged =
    (job.followUpAt?.getTime() ?? null) !== (followUpAt?.getTime() ?? null) ||
    job.reminderLeadDays !== reminder.days ||
    job.reminderLeadHours !== reminder.hours;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      companyName,
      title: requiredText(formData.get("title")),
      ...readJobAttributes(formData),
      description: String(formData.get("description") ?? ""),
      interestDate,
      followUpAt,
      followUpNote: requiredText(formData.get("followUpNote")),
      reminderLeadDays: reminder.days,
      reminderLeadHours: reminder.hours,
      followUpReminderSentAt: reminderChanged ? null : job.followUpReminderSentAt,
    },
  });
  if (formData.get("urlsManaged") === "1") {
    await syncJobUrls(job.id, readUrls(formData));
  }
  await replaceRecordTags("job", job.id, user.id, formData);
  redirect(`/jobs/${job.id}?updated=1`);
}

export async function deleteJob(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  if (!job) redirect("/jobs");
  const [cvs, events] = await Promise.all([
    prisma.jobCv.findMany({ where: { jobId: job.id } }),
    prisma.event.findMany({ where: { jobId: job.id } }),
  ]);
  for (const event of events) await deleteCalendarEvent(user, event.googleCalendarEventId);
  await prisma.job.delete({ where: { id: job.id } });
  for (const cv of cvs) await removeStored(user.id, cv.objectKey);
  redirect("/jobs?updated=1");
}

export async function addJobUrl(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  const url = requiredText(formData.get("url"));
  if (!job || !url) redirect("/jobs?error=required");
  await prisma.jobUrl.create({ data: { jobId: job.id, url, label: requiredText(formData.get("label")) } });
  redirect(`/jobs/${job.id}?created=1`);
}

export async function deleteJobUrl(formData: FormData) {
  const user = await requireUser();
  const url = await prisma.jobUrl.findFirst({
    where: { id: requiredText(formData.get("urlId")), job: { userId: user.id } },
  });
  if (!url) redirect("/jobs");
  await prisma.jobUrl.delete({ where: { id: url.id } });
  redirect(`/jobs/${url.jobId}?updated=1`);
}

export async function uploadCv(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  const file = formData.get("file");
  if (!job || !(file instanceof File)) redirect("/jobs?error=required");
  const saved = await saveUpload(user.id, "cv", file);
  if (!saved) redirect(`/jobs/${job.id}?error=storage`);
  await prisma.jobCv.create({ data: { jobId: job.id, ...saved } });
  redirect(`/jobs/${job.id}?created=1`);
}

export async function deleteCv(formData: FormData) {
  const user = await requireUser();
  const cv = await prisma.jobCv.findFirst({
    where: { id: requiredText(formData.get("cvId")), job: { userId: user.id } },
  });
  if (!cv) redirect("/jobs");
  await prisma.jobCv.delete({ where: { id: cv.id } });
  await removeStored(user.id, cv.objectKey);
  redirect(`/jobs/${cv.jobId}?updated=1`);
}

export async function saveEvent(formData: FormData) {
  const user = await requireUser();
  const result = await persistEvent(user, formData);
  if (!result.ok) redirect(eventReturn(formData, result.jobId, result.contactId, result.error));
  const flash = result.calendarFailed ? "warn=calendar" : result.existed ? "updated=1" : "created=1";
  redirect(eventDone(formData, result.jobId ?? undefined, result.contactId ?? undefined, flash));
}

export async function deleteEvent(formData: FormData) {
  const user = await requireUser();
  const event = await prisma.event.findFirst({
    where: { id: requiredText(formData.get("eventId")), userId: user.id },
  });
  if (!event) redirect(eventDone(formData, undefined, undefined, ""));
  await deleteCalendarEvent(user, event.googleCalendarEventId);
  await prisma.event.delete({ where: { id: event.id } });
  if (event.jobId) await recomputeJobStatus(event.jobId);
  redirect(eventDone(formData, event.jobId ?? undefined, event.contactId ?? undefined, "updated=1"));
}

function readJobAttributes(formData: FormData) {
  return {
    location: requiredText(formData.get("location")),
    employmentType: optionalEnum(formData.get("employmentType"), EMPLOYMENT_TYPES),
    workArrangement: optionalEnum(formData.get("workArrangement"), WORK_ARRANGEMENTS),
    engagement: optionalEnum(formData.get("engagement"), ENGAGEMENTS),
  };
}

function readReminder(formData: FormData): { days: number | null; hours: number | null } | "invalid" {
  const days = optionalInt(formData.get("reminderLeadDays"), 365);
  const hours = optionalInt(formData.get("reminderLeadHours"), 23);
  if (days === "invalid" || hours === "invalid") return "invalid";
  return { days, hours };
}

function readUrls(formData: FormData): string[] {
  if (formData.get("urlsManaged") === "1") {
    return uniqueTexts(formData.getAll("urls"));
  }
  return uniqueTexts(["url1", "url2", "url3"].map((key) => formData.get(key)));
}

function uniqueTexts(values: Array<FormDataEntryValue | null>) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const text = requiredText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    urls.push(text);
  }
  return urls;
}

async function syncJobUrls(jobId: string, urls: string[]) {
  await prisma.jobUrl.deleteMany({ where: { jobId } });
  if (!urls.length) return;
  await prisma.jobUrl.createMany({ data: urls.map((url) => ({ jobId, url })) });
}

async function ownedJob(userId: string, jobId: string) {
  if (!jobId) return null;
  return prisma.job.findFirst({ where: { id: jobId, userId } });
}

function back(formData: FormData, fallback: string, error: string) {
  const returnTo = requiredText(formData.get("returnTo"));
  const path = returnTo.startsWith("/") ? returnTo : fallback;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}error=${error}`;
}

function withReturnTo(formData: FormData, fallback: string, query: string) {
  const returnTo = requiredText(formData.get("returnTo"));
  const path = returnTo.startsWith("/") ? returnTo : fallback;
  if (!query) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${query}`;
}

function eventReturn(formData: FormData, jobId: string | undefined, contactId: string | undefined, error: string) {
  const fallback = jobId ? `/jobs/${jobId}` : contactId ? `/contacts/${contactId}` : "/jobs";
  return withReturnTo(formData, fallback, `error=${error}`);
}

function eventDone(formData: FormData, jobId: string | undefined, contactId: string | undefined, query: string) {
  const fallback = jobId ? `/jobs/${jobId}` : contactId ? `/contacts/${contactId}` : "/jobs";
  return withReturnTo(formData, fallback, query);
}

function optionalEnum<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[]): T | null {
  const text = requiredText(value);
  if (!(allowed as readonly string[]).includes(text)) return null;
  return text as T;
}
