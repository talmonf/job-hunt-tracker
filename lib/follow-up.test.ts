import assert from "node:assert/strict";
import test from "node:test";
import { followUpSuperseded, type FollowUpEvent } from "./follow-up";

const due = new Date("2026-09-13T06:00:00.000Z");
const before = new Date("2026-09-07T06:00:00.000Z");
const after = new Date("2026-09-16T06:00:00.000Z");

function event(type: string, occurredAt: Date, startsAt: Date | null = null): FollowUpEvent {
  return { type, occurredAt, startsAt };
}

test("a missing follow-up date is not cleared again", () => {
  assert.equal(followUpSuperseded({ followUpAt: null, status: "rejected", events: [] }), false);
});

test("a finished role drops its follow-up even when nothing happened after the date", () => {
  for (const status of ["rejected", "not_applicable", "withdrawn"]) {
    assert.equal(followUpSuperseded({ followUpAt: due, status, events: [event("interest", before)] }), true);
  }
});

test("offer, on hold, and parked keep a follow-up that is still in the future", () => {
  const later = new Date("2026-10-10T06:00:00.000Z");
  for (const status of ["offer", "on_hold", "parked", "applied", "interviewing"]) {
    assert.equal(
      followUpSuperseded({ followUpAt: later, status, events: [event("outreach", before)] }),
      false,
    );
  }
});

test("interest events never answer a follow-up", () => {
  assert.equal(
    followUpSuperseded({ followUpAt: due, status: "interest", events: [event("interest", after)] }),
    false,
  );
});

test("an update at or after the follow-up clears it, an earlier one does not", () => {
  assert.equal(
    followUpSuperseded({ followUpAt: due, status: "contacted", events: [event("outreach", before)] }),
    false,
  );
  for (const type of ["outreach", "application", "status_change"]) {
    assert.equal(followUpSuperseded({ followUpAt: due, status: "applied", events: [event(type, due)] }), true);
    assert.equal(followUpSuperseded({ followUpAt: due, status: "applied", events: [event(type, after)] }), true);
  }
});

test("a meeting is compared at its start, or at occurredAt when the start is missing", () => {
  assert.equal(
    followUpSuperseded({
      followUpAt: due,
      status: "interviewing",
      events: [event("meeting", before, after)],
    }),
    true,
  );
  assert.equal(
    followUpSuperseded({
      followUpAt: due,
      status: "interviewing",
      events: [event("meeting", after, before)],
    }),
    false,
  );
  assert.equal(
    followUpSuperseded({
      followUpAt: due,
      status: "interviewing",
      events: [event("meeting", after, null)],
    }),
    true,
  );
});
