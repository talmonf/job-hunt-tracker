import assert from "node:assert/strict";
import test from "node:test";
import { excelSerialToUtcDate, formatDate, wallClockToUtc } from "./dates";

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
