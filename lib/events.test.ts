import assert from "node:assert/strict";
import test from "node:test";
import { defaultResultingStatus } from "./events";

test("event types map to job status", () => {
  assert.equal(defaultResultingStatus("interest"), "interest");
  assert.equal(defaultResultingStatus("outreach"), "contacted");
  assert.equal(defaultResultingStatus("application"), "applied");
  assert.equal(defaultResultingStatus("meeting"), "interviewing");
  assert.equal(defaultResultingStatus("status_change"), null);
});
