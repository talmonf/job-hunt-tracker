import type { Event, Job, User } from "@prisma/client";
import { decryptSecret } from "./crypto";
import { dateTimeInputValue } from "./dates";

type CalendarResult = { id: string; htmlLink: string };

export async function googleAccessToken(refreshToken: string): Promise<string | null> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function syncMeetingToCalendar(input: {
  user: User;
  event: Event;
  job: Job | null;
  enabled: boolean;
}): Promise<CalendarResult | null | "failed"> {
  if (!input.user.calendarRefreshToken) return input.enabled ? "failed" : null;
  const refresh = decryptSecret(input.user.calendarRefreshToken);
  const token = await googleAccessToken(refresh);
  if (!token) return input.enabled || input.event.googleCalendarEventId ? "failed" : null;
  if (!input.enabled) {
    if (input.event.googleCalendarEventId) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${input.event.googleCalendarEventId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    }
    return null;
  }
  const start = input.event.occurredAt;
  const end = input.event.endsAt ?? new Date(start.getTime() + 60 * 60 * 1000);
  const summary = [
    "Interview",
    input.job?.companyName,
    input.job?.title,
    input.event.counterpartyName,
  ]
    .filter(Boolean)
    .join(" · ");
  const payload = {
    summary,
    description: input.event.summary || undefined,
    start: { dateTime: start.toISOString(), timeZone: input.user.timezone },
    end: { dateTime: end.toISOString(), timeZone: input.user.timezone },
  };
  const existing = input.event.googleCalendarEventId;
  const response = await fetch(
    existing
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing}`
      : "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: existing ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) return "failed";
  const json = (await response.json()) as { id?: string; htmlLink?: string };
  if (!json.id) return "failed";
  return { id: json.id, htmlLink: json.htmlLink || "" };
}

export async function deleteCalendarEvent(user: User, eventId: string | null): Promise<void> {
  if (!eventId || !user.calendarRefreshToken) return;
  const token = await googleAccessToken(decryptSecret(user.calendarRefreshToken));
  if (!token) return;
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function calendarRangeLabel(start: Date, end: Date | null, timeZone: string): string {
  const from = dateTimeInputValue(start, timeZone).replace("T", " ");
  if (!end) return from;
  return `${from} – ${dateTimeInputValue(end, timeZone).replace("T", " ")}`;
}
