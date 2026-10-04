import assert from "node:assert/strict";
import test from "node:test";
import { canonicalPartialDate, parsePartialDate } from "./partial-date";

test("partial dates accept a year, a month and year, or dd/mm/yyyy", () => {
  assert.equal(canonicalPartialDate("2014"), "2014");
  assert.equal(canonicalPartialDate("6/2014"), "06/2014");
  assert.equal(canonicalPartialDate("04/10/2014"), "04/10/2014");
  assert.equal(canonicalPartialDate(" 4/6/2014 "), "04/06/2014");
  assert.equal(parsePartialDate(""), null);
  assert.equal(canonicalPartialDate("31/02/2014"), null);
  assert.equal(canonicalPartialDate("13/2014"), null);
  assert.equal(canonicalPartialDate("2014/06"), null);
});
