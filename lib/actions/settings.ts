"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireUser } from "../session";
import { optionalFloat, optionalInt } from "../forms";
import { googleConfigured } from "../mail";
import { importWorkbook } from "../excel";

export async function saveGoals(formData: FormData) {
  const user = await requireUser();
  const applicationsPerDay = optionalFloat(formData.get("applicationsPerDay"));
  const networkingPerDay = optionalFloat(formData.get("networkingPerDay"));
  const networkingPerWeek = optionalFloat(formData.get("networkingPerWeek"));
  const interviewPracticeMinutesPerDay = optionalFloat(formData.get("interviewPracticeMinutesPerDay"));
  const learningMinutesPerDay = optionalFloat(formData.get("learningMinutesPerDay"));
  const searchMinutesOverride = optionalFloat(formData.get("searchMinutesOverride"));
  if (
    applicationsPerDay === "invalid" ||
    networkingPerDay === "invalid" ||
    networkingPerWeek === "invalid" ||
    interviewPracticeMinutesPerDay === "invalid" ||
    learningMinutesPerDay === "invalid" ||
    searchMinutesOverride === "invalid"
  ) {
    redirect("/settings?error=required");
  }
  const data = {
    applicationsPerDay: applicationsPerDay ?? 0,
    networkingPerDay,
    networkingPerWeek,
    interviewPracticeMinutesPerDay: interviewPracticeMinutesPerDay ?? 0,
    learningMinutesPerDay: learningMinutesPerDay ?? 0,
    searchMinutesOverride,
  };
  await prisma.userGoals.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  redirect("/settings?updated=1");
}

export async function saveDigest(formData: FormData) {
  const user = await requireUser();
  const days = optionalInt(formData.get("digestDaysAhead"), 90);
  const hour = optionalInt(formData.get("digestHour"), 23);
  if (days === "invalid" || hour === "invalid" || days === null || hour === null) redirect("/settings?error=required");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      digestEnabled: formData.get("digestEnabled") === "1",
      digestDaysAhead: days,
      digestHour: hour,
    },
  });
  redirect("/settings?updated=1");
}

export async function disconnectCalendar() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { calendarRefreshToken: null, calendarEmail: null },
  });
  redirect("/settings?updated=1");
}

export async function startCalendarLink() {
  const user = await requireUser();
  if (!googleConfigured()) redirect("/settings?error=calendar");
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("gcal_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const redirectUri = `${process.env.AUTH_URL || "http://localhost:3000"}/api/calendar/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `${state}:${user.id}`);
  redirect(url.toString());
}

export async function importMentme(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/settings?error=import");
  try {
    const result = await importWorkbook(user.id, Buffer.from(await file.arrayBuffer()), user.timezone);
    redirect(`/settings?created=1&jobs=${result.jobs}&contacts=${result.contacts}&events=${result.events}&goals=${result.goals}`);
  } catch {
    redirect("/settings?error=import");
  }
}
