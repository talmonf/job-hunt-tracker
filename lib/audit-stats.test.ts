import assert from "node:assert/strict";
import test from "node:test";
import { addIsoDays, dailyWindow, distribution, eachIsoDay, medianOf } from "./audit-stats";

test("median uses the middle value, or the mean of the two middle values", () => {
  assert.equal(medianOf([]), 0);
  assert.equal(medianOf([4]), 4);
  assert.equal(medianOf([1, 4]), 2.5);
  assert.equal(medianOf([4, 1, 9]), 4);
  assert.equal(medianOf([0, 2, 4, 9]), 3);
});

test("average and median include accounts with zero", () => {
  const stats = distribution([2, 4], 4);
  assert.deepEqual(stats, { total: 6, withAny: 2, max: 4, average: 1.5, median: 1 });
  assert.deepEqual(distribution([], 0), { total: 0, withAny: 0, max: 0, average: 0, median: 0 });
  assert.equal(distribution([3], 1).median, 3);
});

test("daily window is the last 30 days unless dates are set", () => {
  assert.deepEqual(dailyWindow("", "", "2026-10-27"), {
    from: "2026-09-28",
    to: "2026-10-27",
    truncated: false,
  });
  const ranged = dailyWindow("2026-10-01", "2026-10-03", "2026-10-27");
  assert.deepEqual(ranged, { from: "2026-10-01", to: "2026-10-03", truncated: false });
  assert.deepEqual(eachIsoDay(ranged.from, ranged.to), ["2026-10-01", "2026-10-02", "2026-10-03"]);
});

test("a range longer than 366 days keeps the latest 366", () => {
  const window = dailyWindow("2024-01-01", "2026-10-27", "2026-10-27");
  assert.equal(window.truncated, true);
  assert.equal(window.to, "2026-10-27");
  assert.equal(addIsoDays(window.from, 365), "2026-10-27");
  assert.equal(eachIsoDay(window.from, window.to).length, 366);
});
