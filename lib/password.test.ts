import assert from "node:assert/strict";
import test from "node:test";
import { addCalendarMonths, passwordRule } from "./password";

test("password rules report the first failure", () => {
  assert.equal(passwordRule("short"), "length");
  assert.equal(passwordRule("ALLUPPER1"), "lower");
  assert.equal(passwordRule("alllower1"), "upper");
  assert.equal(passwordRule("NoDigits"), "digit");
  assert.equal(passwordRule("GoodPass1"), null);
  assert.equal(passwordRule("עבריתAa1"), null);
});

test("month addition clamps short months", () => {
  const from = new Date(Date.UTC(2026, 0, 31, 12, 0, 0));
  const next = addCalendarMonths(from, 1);
  assert.equal(next.toISOString().slice(0, 10), "2026-02-28");
});
