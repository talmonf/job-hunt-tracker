import assert from "node:assert/strict";
import test from "node:test";
import { companyNameKey } from "./company-name";
import { jobsForCompanyStatus } from "./companies";

test("company name key trims and ignores case", () => {
  assert.equal(companyNameKey("  Northwind "), "northwind");
  assert.equal(companyNameKey("NORTHWIND"), companyNameKey("northwind"));
  assert.equal(companyNameKey("   "), "");
});

test("a company status cell lists one role, or only active roles when there are several", () => {
  assert.deepEqual(jobsForCompanyStatus([]), []);
  assert.deepEqual(jobsForCompanyStatus([{ id: "a", status: "rejected" }]), [{ id: "a", status: "rejected" }]);
  assert.deepEqual(
    jobsForCompanyStatus([
      { id: "a", status: "interviewing" },
      { id: "b", status: "rejected" },
    ]),
    [{ id: "a", status: "interviewing" }],
  );
  assert.deepEqual(
    jobsForCompanyStatus([
      { id: "a", status: "rejected" },
      { id: "b", status: "withdrawn" },
    ]),
    [],
  );
});
