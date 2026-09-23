"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { channelLabel, eventTypeLabel, stageLabel, statusLabel, t } from "@/lib/i18n";
import { CHANNELS, EVENT_TYPES, JOB_STATUSES, STAGES } from "@/lib/events";
import { DateTimeField, fieldClass, labelClass, SubmitButton } from "./widgets";

export function EventForm({
  action,
  lang,
  jobs,
  contacts,
  notes,
  cvs,
  calendarLinked,
  defaultJobId,
  defaultContactId,
  event,
}: {
  action: (formData: FormData) => void;
  lang: Lang;
  jobs: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  notes: { id: string; label: string }[];
  cvs: { id: string; label: string }[];
  calendarLinked: boolean;
  defaultJobId?: string;
  defaultContactId?: string;
  event?: {
    id: string;
    type: string;
    occurredAt: string;
    endsAt: string;
    channel: string;
    stage: string;
    counterpartyName: string;
    summary: string;
    noteVersionId: string;
    cvId: string;
    tailoredCv: boolean;
    resultingStatus: string;
    onCalendar: boolean;
  };
}) {
  const [type, setType] = useState(event?.type || "interest");
  return (
    <form action={action} className="grid gap-3">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <label>
        <span className={labelClass}>{t(lang, "eventType")}</span>
        <select className={fieldClass} name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {EVENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {eventTypeLabel(lang, value)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>{t(lang, "jobs")}</span>
          <select className={fieldClass} name="jobId" defaultValue={defaultJobId || ""}>
            <option value="">{t(lang, "none")}</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>{t(lang, "networking")}</span>
          <select className={fieldClass} name="contactId" defaultValue={defaultContactId || ""}>
            <option value="">{t(lang, "none")}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className={labelClass}>{type === "meeting" ? t(lang, "meetingFrom") : t(lang, "when")}</span>
        <DateTimeField name="occurredAt" defaultValue={event?.occurredAt} required />
      </label>
      {type === "meeting" ? (
        <>
          <label>
            <span className={labelClass}>
              {t(lang, "meetingTo")} ({t(lang, "optional")})
            </span>
            <DateTimeField name="endsAt" defaultValue={event?.endsAt} />
          </label>
          <p className="text-xs text-slate-400">{t(lang, "calendarDefaultLength")}</p>
          <label>
            <span className={labelClass}>{t(lang, "stage")}</span>
            <select className={fieldClass} name="stage" defaultValue={event?.stage || "hr"}>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabel(lang, stage)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="addToCalendar" value="1" defaultChecked={event?.onCalendar || calendarLinked} disabled={!calendarLinked} />
            {t(lang, "addToCalendar")}
          </label>
        </>
      ) : null}
      {type === "outreach" || type === "meeting" ? (
        <label>
          <span className={labelClass}>{t(lang, "channel")}</span>
          <select className={fieldClass} name="channel" defaultValue={event?.channel || (type === "meeting" ? "video" : "email")}>
            {type === "meeting" ? <option value="">{t(lang, "none")}</option> : null}
            {CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabel(lang, channel)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {type === "status_change" ? (
        <label>
          <span className={labelClass}>{t(lang, "resultingStatus")}</span>
          <select className={fieldClass} name="resultingStatus" defaultValue={event?.resultingStatus || "rejected"}>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(lang, status)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        <span className={labelClass}>{t(lang, "who")}</span>
        <input className={fieldClass} name="counterpartyName" defaultValue={event?.counterpartyName || ""} />
      </label>
      {type === "application" ? (
        <>
          <label>
            <span className={labelClass}>{t(lang, "whichCv")}</span>
            <select className={fieldClass} name="cvId" defaultValue={event?.cvId || ""}>
              <option value="">{t(lang, "none")}</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="tailoredCv" value="1" defaultChecked={event?.tailoredCv} />
            {t(lang, "tailored")}
          </label>
        </>
      ) : null}
      <label>
        <span className={labelClass}>{t(lang, "noteVersion")}</span>
        <select className={fieldClass} name="noteVersionId" defaultValue={event?.noteVersionId || ""}>
          <option value="">{t(lang, "none")}</option>
          {notes.map((note) => (
            <option key={note.id} value={note.id}>
              {note.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>{t(lang, "summary")}</span>
        <textarea className={fieldClass} name="summary" rows={3} defaultValue={event?.summary || ""} />
      </label>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
