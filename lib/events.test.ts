import assert from "node:assert/strict";
import test from "node:test";
import { defaultResultingStatus, eventLoggedAt, eventScheduledStart, statusesForJobList } from "./events";
import { eventHappenedLabel, meetingKindLabel } from "./i18n";

test("parked jobs stay out of the default list", () => {
  const defaults = statusesForJobList([]);
  assert.equal(defaults.includes("parked"), false);
  assert.equal(defaults.includes("not_applicable"), true);
  assert.deepEqual(statusesForJobList(["parked"]), ["parked"]);
  assert.deepEqual(statusesForJobList(["nope", "applied"]), ["applied"]);
});

test("event types map to job status", () => {
  assert.equal(defaultResultingStatus("interest"), "interest");
  assert.equal(defaultResultingStatus("outreach"), "contacted");
  assert.equal(defaultResultingStatus("application"), "applied");
  assert.equal(defaultResultingStatus("meeting"), "interviewing");
  assert.equal(defaultResultingStatus("status_change"), null);
});

test("legacy meetings treat occurredAt as the scheduled start", () => {
  const createdAt = new Date("2026-09-29T18:00:00.000Z");
  const occurredAt = new Date("2026-10-06T11:00:00.000Z");
  const event = { type: "meeting", occurredAt, startsAt: null, createdAt };
  assert.equal(eventLoggedAt(event), createdAt);
  assert.equal(eventScheduledStart(event), occurredAt);
});

test("saved meetings keep occurredAt as when they were scheduled", () => {
  const createdAt = new Date("2026-09-29T18:00:00.000Z");
  const occurredAt = new Date("2026-09-29T17:30:00.000Z");
  const startsAt = new Date("2026-10-06T11:00:00.000Z");
  const event = { type: "meeting", occurredAt, startsAt, createdAt };
  assert.equal(eventLoggedAt(event), occurredAt);
  assert.equal(eventScheduledStart(event), startsAt);
});

test("meeting labels say the stage was scheduled", () => {
  assert.equal(eventHappenedLabel("en", "meeting", "hr"), "HR / screening meeting scheduled");
  assert.equal(eventHappenedLabel("he", "meeting", "hr"), "פגישת אישיותי / HR נקבעה");
  assert.equal(eventHappenedLabel("en", "application"), "Application sent");
});

test("status updates include the new status", () => {
  assert.equal(eventHappenedLabel("en", "status_change", null, "rejected"), "Status update (Rejected)");
  assert.equal(eventHappenedLabel("he", "status_change", null, "rejected"), "עדכון סטטוס (נדחה)");
  assert.equal(eventHappenedLabel("en", "status_change"), "Status update");
  assert.equal(
    eventHappenedLabel("en", "status_change", null, "applied", "interest"),
    "Status update (\u2066Interest → Applied\u2069)",
  );
  assert.equal(
    eventHappenedLabel("he", "status_change", null, "parked", "contacted"),
    "עדכון סטטוס (\u2066פניתי → מוקפא\u2069)",
  );
});

test("upcoming meetings name the interview kind", () => {
  assert.equal(meetingKindLabel("en", "hr"), "HR / screening interview");
  assert.equal(meetingKindLabel("en", "technical"), "Technical interview");
  assert.equal(meetingKindLabel("he", "hr"), "ראיון אישיותי / HR");
});
