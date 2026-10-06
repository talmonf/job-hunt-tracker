import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTime } from "./dates";
import {
  applicationOutcome,
  applicationSummary,
  channelFromText,
  followUpNoteFromReminder,
  hoursToMinutes,
  interviewNoteBody,
  interviewStage,
  isTerminalJobStatus,
  parseImportedDate,
  splitContactDetails,
} from "./excel-map";

const zone = "Asia/Jerusalem";

test("a date-only Excel value is 09:00 in the user timezone", () => {
  const fromUtcMidnight = parseImportedDate(new Date(Date.UTC(2026, 9, 5)), zone);
  const fromSerial = parseImportedDate(46271, zone);
  const fromText = parseImportedDate("5/10/2026", zone);
  assert.equal(formatDateTime(fromUtcMidnight!, zone), "05/10/2026 09:00");
  assert.equal(fromUtcMidnight?.toISOString(), "2026-10-05T06:00:00.000Z");
  assert.equal(formatDateTime(fromSerial!, zone), "06/09/2026 09:00");
  assert.equal(formatDateTime(fromText!, zone), "05/10/2026 09:00");
});

test("an Excel time is kept as the wall clock instead of 09:00", () => {
  const dated = parseImportedDate(new Date(Date.UTC(2026, 9, 5, 14, 30)), zone);
  assert.equal(formatDateTime(dated!, zone), "05/10/2026 14:30");
  const text = parseImportedDate("05/10/2026 16:45", zone);
  assert.equal(formatDateTime(text!, zone), "05/10/2026 16:45");
});

test("winter dates still land at 09:00 local", () => {
  const dated = parseImportedDate(new Date(Date.UTC(2026, 0, 15)), zone);
  assert.equal(formatDateTime(dated!, zone), "15/01/2026 09:00");
  assert.equal(dated?.toISOString(), "2026-01-15T07:00:00.000Z");
});

test("application answers fill the summary and the job status", () => {
  assert.equal(applicationOutcome("לא עברתי"), "rejected");
  assert.equal(applicationOutcome("קיבלתי הצעה"), "offer");
  assert.equal(applicationOutcome("עברתי לראיון"), "interviewing");
  assert.equal(applicationOutcome("לא קיבלתי הצעה"), null);
  assert.equal(isTerminalJobStatus("rejected"), true);
  assert.equal(isTerminalJobStatus("interviewing"), false);
  assert.equal(followUpNoteFromReminder("כן"), "שלחתי מייל תזכורת: כן");
  assert.match(applicationSummary({ how: "לינקדאין", response: "לא עברתי", gotUpdate: "לא", notes: "הערה", reply: "" }), /תשובה: לא עברתי/);
  assert.match(applicationSummary({ how: "לינקדאין", response: "לא עברתי", gotUpdate: "לא", notes: "הערה", reply: "" }), /קיבלתי עדכון: לא/);
});

test("contact details fill email, mobile, and LinkedIn", () => {
  const details = splitContactDetails("050-123-4567 jane@example.com https://www.linkedin.com/in/jane הערה");
  assert.equal(details.email, "jane@example.com");
  assert.equal(details.mobile, "050-123-4567");
  assert.equal(details.linkedinUrl, "https://www.linkedin.com/in/jane");
  assert.match(details.contactDetails, /הערה/);
});

test("goal hours are stored as minutes", () => {
  assert.equal(hoursToMinutes(1), 60);
  assert.equal(hoursToMinutes(0.5), 30);
  assert.equal(hoursToMinutes(1 / 24, "h:mm"), 60);
});

test("interview type maps to stage and channel, and checklist answers stay in the note", () => {
  assert.equal(interviewStage("ראיון מקצועי"), "technical");
  assert.equal(interviewStage("ראיון עם המנהל"), "manager");
  assert.equal(channelFromText("זום"), "video");
  assert.equal(channelFromText("ראיון טלפוני"), "phone");
  const body = interviewNoteBody({
    kind: "זום",
    summary: "הלך טוב",
    positives: "",
    negatives: "",
    lessons: "",
    thankYou: "כן",
    reminder: "לא",
    gotUpdate: "כן",
    feedback: "לא",
    askedFeedback: "כן",
    thanked: "כן",
    notes: "פידבק קצר",
  });
  assert.match(body, /הודעת תודה: כן/);
  assert.match(body, /ביקשתי פידבק: כן/);
  assert.match(body, /הערות: פידבק קצר/);
});
