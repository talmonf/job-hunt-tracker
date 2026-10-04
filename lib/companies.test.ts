import assert from "node:assert/strict";
import test from "node:test";
import { companyNameKey } from "./company-name";

test("company name key trims and ignores case", () => {
  assert.equal(companyNameKey("  Northwind "), "northwind");
  assert.equal(companyNameKey("NORTHWIND"), companyNameKey("northwind"));
  assert.equal(companyNameKey("   "), "");
});
