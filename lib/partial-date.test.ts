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

test("eight digits are a day without slashes", () => {
  assert.equal(canonicalPartialDate("15032020"), "15/03/2020");
  assert.equal(canonicalPartialDate("01012020"), "01/01/2020");
  assert.equal(canonicalPartialDate("29022020"), "29/02/2020");
  assert.equal(canonicalPartialDate("29022021"), null);
  assert.equal(canonicalPartialDate("32012020"), null);
  assert.equal(canonicalPartialDate("00012020"), null);
  assert.equal(canonicalPartialDate("1503202"), null);
});
