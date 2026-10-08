import assert from "node:assert/strict";
import test from "node:test";
import { companyNameKey, defaultWorkplaceName, withWorkplaceCompany } from "./company-name";
import { jobsForCompanyStatus } from "./companies";

test("company name key trims and ignores case", () => {
  assert.equal(companyNameKey("  Northwind "), "northwind");
  assert.equal(companyNameKey("NORTHWIND"), companyNameKey("northwind"));
  assert.equal(companyNameKey("   "), "");
});

test("workplace is one of the contact companies, and a missing name is added", () => {
  const past = { name: "Old Co", startedOn: "", startedUnknown: false, endedOn: "2020", endedUnknown: false };
  const listed = withWorkplaceCompany([past], "Acme");
  assert.equal(listed[0]?.name, "Acme");
  assert.equal(listed.length, 2);
  assert.equal(withWorkplaceCompany(listed, "acme").length, 2);
  assert.equal(defaultWorkplaceName("acme", [{ name: "Acme", current: false }]), "Acme");
  assert.equal(
    defaultWorkplaceName("", [
      { name: "Old Co", current: false },
      { name: "Acme", current: true },
    ]),
    "Acme",
  );
  assert.equal(defaultWorkplaceName("", [{ name: "Beta", current: false }]), "Beta");
  assert.equal(defaultWorkplaceName("Gone", []), "");
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
