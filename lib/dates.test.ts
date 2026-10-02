import assert from "node:assert/strict";
import test from "node:test";
import {
  excelSerialToUtcDate,
  formatDate,
  formatScheduledDay,
  formatScheduledRange,
  formatWeekRange,
  startOfSundayWeek,
  wallClockToUtc,
} from "./dates";

test("excel serial 46271 is 6 September 2026", () => {
  const date = excelSerialToUtcDate(46271);
  assert.equal(date.toISOString().slice(0, 10), "2026-09-06");
});

test("wall clock in Jerusalem becomes UTC", () => {
  const date = wallClockToUtc("2026-09-22T08:00", "Asia/Jerusalem");
  assert.ok(date);
  assert.equal(date?.toISOString(), "2026-09-22T05:00:00.000Z");
  assert.equal(formatDate(date!, "Asia/Jerusalem"), "22/09/2026");
});

test("date-only upcoming items use the same weekday and day", () => {
  const day = wallClockToUtc("2026-10-04T00:00", "Asia/Jerusalem");
  assert.ok(day);
  assert.equal(formatScheduledDay(day!, "Asia/Jerusalem", "en"), "Sun 4/10");
  assert.equal(formatScheduledDay(day!, "Asia/Jerusalem", "he"), "יום א׳ 4/10");
});

test("scheduled meeting range omits year and repeats the date once", () => {
  const start = wallClockToUtc("2026-10-06T14:00", "Asia/Jerusalem");
  const end = wallClockToUtc("2026-10-06T14:30", "Asia/Jerusalem");
  assert.ok(start);
  assert.ok(end);
  assert.equal(formatScheduledRange(start!, end, "Asia/Jerusalem", "en"), "Tues 6/10 14:00 - 14:30");
  assert.equal(formatScheduledRange(start!, end, "Asia/Jerusalem", "he"), "יום ג׳ 6/10 14:00 - 14:30");
});

test("this week is Sunday to Saturday", () => {
  const wednesday = wallClockToUtc("2026-09-30T10:00", "Asia/Jerusalem");
  assert.ok(wednesday);
  const weekStart = startOfSundayWeek(wednesday!, "Asia/Jerusalem");
  assert.equal(formatDate(weekStart, "Asia/Jerusalem"), "27/09/2026");
  assert.equal(formatWeekRange(weekStart, "Asia/Jerusalem", "en"), "Sun 27 Sep - Sat 3 Oct");
  assert.equal(formatWeekRange(weekStart, "Asia/Jerusalem", "he"), "יום א׳ 27 ספט׳ - שבת 3 אוק׳");
});

test("week labels match Sunday-Saturday examples", () => {
  const lateAugust = wallClockToUtc("2026-08-30T00:00", "Asia/Jerusalem");
  const earlySeptember = wallClockToUtc("2026-09-06T00:00", "Asia/Jerusalem");
  assert.ok(lateAugust);
  assert.ok(earlySeptember);
  assert.equal(formatWeekRange(lateAugust!, "Asia/Jerusalem", "en"), "Sun 30 Aug - Sat 5 Sep");
  assert.equal(formatWeekRange(earlySeptember!, "Asia/Jerusalem", "en"), "Sun 6 Sep - Sat 12 Sep");
});
