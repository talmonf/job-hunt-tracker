"use server";

import { redirect } from "next/navigation";
import type { Channel, EventType, JobStatus, MeetingStage } from "@prisma/client";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { addDays, wallClockToUtc } from "../dates";
import { optionalInt, parseDateOnly, parseDateTime, requiredText } from "../forms";
import { defaultResultingStatus, CHANNELS, EVENT_TYPES, JOB_STATUSES, STAGES } from "../events";
import { recomputeJobStatus } from "../job-status";
import { removeStored, saveUpload } from "../files";
import { deleteCalendarEvent, syncMeetingToCalendar } from "../calendar";

export async function createJob(formData: FormData) {
  const user = await requireUser();
  const companyName = requiredText(formData.get("companyName"));
  const title = requiredText(formData.get("title"));
  const description = String(formData.get("description") ?? "");
  const interestDate = parseDateOnly(formData.get("interestDate"), user.timezone);
  if (!companyName || !interestDate) redirect(back(formData, "/jobs", "required"));
  let followUpAt = parseDateTime(formData.get("followUpAt"), user.timezone);
  if (!followUpAt) {
    const day = addDays(interestDate, 7);
    followUpAt = wallClockToUtc(`${day.toISOString().slice(0, 10)}T09:00`, user.timezone) ?? addDays(interestDate, 7);
  }
  const reminder = readReminder(formData);
  if (reminder === "invalid") redirect(back(formData, "/jobs", "required"));
  const job = await prisma.job.create({
    data: {
      userId: user.id,
      companyName,
      title,
      description,
      interestDate,
      followUpAt,
      reminderLeadDays: reminder.days,
      reminderLeadHours: reminder.hours,
      status: "interest",
    },
  });
  await prisma.jobUrl.createMany({
    data: readUrls(formData).map((url) => ({ jobId: job.id, url })),
  });
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
  redirect("/jobs?created=1");
}

export async function updateJob(formData: FormData) {
  const user = await requireUser();
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  if (!job) redirect("/jobs?error=required");
  const companyName = requiredText(formData.get("companyName"));
  const interestDate = parseDateOnly(formData.get("interestDate"), user.timezone);
  const followUpAt = parseDateTime(formData.get("followUpAt"), user.timezone);
  if (!companyName || !interestDate || !followUpAt) redirect(`/jobs/${job.id}?error=required`);
  const reminder = readReminder(formData);
  if (reminder === "invalid") redirect(`/jobs/${job.id}?error=required`);
  const reminderChanged =
    job.followUpAt.getTime() !== followUpAt.getTime() ||
    job.reminderLeadDays !== reminder.days ||
    job.reminderLeadHours !== reminder.hours;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      companyName,
      title: requiredText(formData.get("title")),
      description: String(formData.get("description") ?? ""),
      interestDate,
      followUpAt,
      reminderLeadDays: reminder.days,
      reminderLeadHours: reminder.hours,
      followUpReminderSentAt: reminderChanged ? null : job.followUpReminderSentAt,
    },
  });
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
  const type = requiredText(formData.get("type")) as EventType;
  if (!EVENT_TYPES.includes(type)) redirect("/jobs?error=required");
  const jobId = requiredText(formData.get("jobId"));
  const contactId = requiredText(formData.get("contactId"));
  const job = jobId ? await ownedJob(user.id, jobId) : null;
  const contact = contactId
    ? await prisma.contact.findFirst({ where: { id: contactId, userId: user.id } })
    : null;
  if (!job && !contact) redirect("/jobs?error=link");
  const occurredAt = parseDateTime(formData.get("occurredAt"), user.timezone);
  if (!occurredAt) redirect(eventReturn(job?.id, contact?.id, "date"));
  const endsAt = type === "meeting" ? parseDateTime(formData.get("endsAt"), user.timezone) : null;
  if (endsAt && endsAt.getTime() < occurredAt.getTime()) redirect(eventReturn(job?.id, contact?.id, "date"));
  const channel = optionalEnum(formData.get("channel"), CHANNELS) as Channel | null;
  const stage = optionalEnum(formData.get("stage"), STAGES) as MeetingStage | null;
  let resultingStatus = defaultResultingStatus(type);
  if (type === "status_change") {
    const picked = requiredText(formData.get("resultingStatus")) as JobStatus;
    if (!JOB_STATUSES.includes(picked)) redirect(eventReturn(job?.id, contact?.id, "required"));
    resultingStatus = picked;
  }
  if (type === "outreach" && !channel) redirect(eventReturn(job?.id, contact?.id, "required"));
  if (type === "meeting" && !stage) redirect(eventReturn(job?.id, contact?.id, "required"));
  const noteVersionId = requiredText(formData.get("noteVersionId"));
  const noteVersion = noteVersionId
    ? await prisma.noteVersion.findFirst({ where: { id: noteVersionId, note: { userId: user.id } } })
    : null;
  const cvId = requiredText(formData.get("cvId"));
  const cv = cvId && job ? await prisma.jobCv.findFirst({ where: { id: cvId, jobId: job.id } }) : null;
  const eventId = requiredText(formData.get("eventId"));
  const existing = eventId
    ? await prisma.event.findFirst({ where: { id: eventId, userId: user.id } })
    : null;
  const data = {
    type,
    occurredAt,
    endsAt,
    jobId: job?.id ?? null,
    contactId: contact?.id ?? null,
    channel: type === "outreach" || type === "meeting" ? channel : null,
    counterpartyName: requiredText(formData.get("counterpartyName")),
    stage: type === "meeting" ? stage : null,
    resultingStatus,
    summary: String(formData.get("summary") ?? ""),
    noteVersionId: noteVersion?.id ?? null,
    cvId: cv?.id ?? null,
    tailoredCv: type === "application" ? formData.get("tailoredCv") === "1" : null,
  };
  const saved = existing
    ? await prisma.event.update({ where: { id: existing.id }, data })
    : await prisma.event.create({ data: { userId: user.id, ...data } });
  let calendarFailed = false;
  if (type === "meeting") {
    const wantCalendar = formData.get("addToCalendar") === "1" || Boolean(existing?.googleCalendarEventId && formData.get("addToCalendar") === "1");
    const sync = await syncMeetingToCalendar({
      user,
      event: { ...saved, googleCalendarEventId: existing?.googleCalendarEventId ?? null },
      job,
      enabled: formData.get("addToCalendar") === "1",
    });
    if (sync === "failed") calendarFailed = true;
    else if (sync) {
      await prisma.event.update({
        where: { id: saved.id },
        data: { googleCalendarEventId: sync.id, googleCalendarHtmlLink: sync.htmlLink },
      });
    } else if (existing?.googleCalendarEventId) {
      await prisma.event.update({
        where: { id: saved.id },
        data: { googleCalendarEventId: null, googleCalendarHtmlLink: null },
      });
    }
    void wantCalendar;
  }
  if (job) await recomputeJobStatus(job.id);
  if (existing?.jobId && existing.jobId !== job?.id) await recomputeJobStatus(existing.jobId);
  const target = job ? `/jobs/${job.id}` : `/contacts/${contact!.id}`;
  redirect(`${target}?${calendarFailed ? "warn=calendar" : existing ? "updated=1" : "created=1"}`);
}

export async function deleteEvent(formData: FormData) {
  const user = await requireUser();
  const event = await prisma.event.findFirst({
    where: { id: requiredText(formData.get("eventId")), userId: user.id },
  });
  if (!event) redirect("/jobs");
  await deleteCalendarEvent(user, event.googleCalendarEventId);
  await prisma.event.delete({ where: { id: event.id } });
  if (event.jobId) await recomputeJobStatus(event.jobId);
  redirect(event.jobId ? `/jobs/${event.jobId}?updated=1` : event.contactId ? `/contacts/${event.contactId}?updated=1` : "/jobs?updated=1");
}

function readReminder(formData: FormData): { days: number | null; hours: number | null } | "invalid" {
  const days = optionalInt(formData.get("reminderLeadDays"), 365);
  const hours = optionalInt(formData.get("reminderLeadHours"), 23);
  if (days === "invalid" || hours === "invalid") return "invalid";
  return { days, hours };
}

function readUrls(formData: FormData): string[] {
  return ["url1", "url2", "url3"].map((key) => requiredText(formData.get(key))).filter(Boolean);
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

function eventReturn(jobId: string | undefined, contactId: string | undefined, error: string) {
  if (jobId) return `/jobs/${jobId}?error=${error}`;
  if (contactId) return `/contacts/${contactId}?error=${error}`;
  return `/jobs?error=${error}`;
}

function optionalEnum(value: FormDataEntryValue | null, allowed: readonly string[]) {
  const text = requiredText(value);
  if (!text) return null;
  return allowed.includes(text) ? text : null;
}
