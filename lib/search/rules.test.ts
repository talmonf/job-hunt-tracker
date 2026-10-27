import assert from "node:assert/strict";
import test from "node:test";
import { classifyInbox, jobSearchPatch, judge, mainNav, matchKnownJob, replyShouldApply, searchIsDue, type Candidate, type SearchProfile } from "./rules";

const now = new Date("2026-10-27T12:00:00Z");

function profile(overrides: Partial<SearchProfile> = {}): SearchProfile {
  return {
    terms: ["qa", "בדיקות"],
    excludedTitle: ["hardware"],
    excludedDescription: ["fda", "mdr", "iso 13485"],
    maxAgeDays: 14,
    hideJunior: true,
    regionsOff: [],
    extraPlaces: [],
    disabledRules: new Set(),
    ...overrides,
  };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "1",
    company: "Acme",
    title: "QA Lead",
    location: "Tel Aviv, Israel",
    description: "Build automation.",
    url: "https://jobs.example.com/qa-lead",
    externalId: "qa-lead",
    publishedAt: new Date("2026-10-20T00:00:00Z"),
    updatedOnly: false,
    israelAssumed: false,
    ...overrides,
  };
}

test("a title without a search term is not listed or counted", () => {
  const result = classifyInbox([candidate({ title: "Accountant" })], profile(), [], now);
  assert.equal(result.visible.length, 0);
  assert.equal(result.counts.excluded, 0);
});

test("both rules must be off before a job they hold back is shown", () => {
  const job = candidate({ title: "QA hardware", publishedAt: new Date("2026-09-01T00:00:00Z") });
  const held = classifyInbox([job], profile(), [], now);
  assert.equal(held.visible.length, 0);
  assert.equal(held.counts.excluded, 1);
  assert.equal(held.counts.age, 1);

  const oneOff = classifyInbox([job], profile({ disabledRules: new Set(["excluded"]) }), [], now);
  assert.equal(oneOff.visible.length, 0);
  assert.equal(oneOff.counts.age, 1);

  const bothOff = classifyInbox([job], profile({ disabledRules: new Set(["excluded", "age"]) }), [], now);
  assert.equal(bothOff.visible.length, 1);
  assert.deepEqual(bothOff.visible[0]?.waived.sort(), ["age", "excluded"]);
});

test("a region holds a job back only when every place is in a region that is off", () => {
  const telAviv = judge(candidate({ location: "Tel Aviv" }), profile({ regionsOff: ["telAviv"] }), [], now);
  assert.ok(telAviv.failed.includes("region"));

  const bothCities = judge(candidate({ location: "Tel Aviv or Haifa" }), profile({ regionsOff: ["telAviv"] }), [], now);
  assert.equal(bothCities.failed.includes("region"), false);

  const caesarea = judge(candidate({ location: "Caesarea" }), profile({ regionsOff: ["sharon"] }), [], now);
  assert.equal(caesarea.failed.includes("region"), false);

  const caesareaBoth = judge(candidate({ location: "Caesarea" }), profile({ regionsOff: ["sharon", "north"] }), [], now);
  assert.ok(caesareaBoth.failed.includes("region"));

  const country = judge(candidate({ location: "Israel" }), profile({ regionsOff: ["telAviv", "sharon", "center", "jerusalem", "judea", "south", "north"] }), [], now);
  assert.equal(country.failed.includes("region"), false);
});

test("outside Israel is its own gate, and AllJobs mail counts as Israel", () => {
  const london = judge(candidate({ location: "London" }), profile(), [], now);
  assert.ok(london.failed.includes("outside_israel"));

  const alert = judge(candidate({ location: "", israelAssumed: true }), profile(), [], now);
  assert.equal(alert.failed.includes("outside_israel"), false);
  assert.equal(alert.failed.includes("unknown_location"), false);
});

test("a known company and title stays out, and a later repost is separate", () => {
  const known = [{ company: "Acme", title: "QA Lead", urls: [], lastActionAt: new Date("2026-10-25T00:00:00Z") }];
  const same = classifyInbox([candidate()], profile(), known, now);
  assert.equal(same.visible.length, 0);
  assert.equal(same.counts.known, 1);

  const repost = classifyInbox([candidate({ publishedAt: new Date("2026-10-26T00:00:00Z") })], profile(), known, now);
  assert.equal(repost.reposted.length, 1);
  assert.equal(repost.visible.length, 0);
});

test("lead titles sort ahead of engineer titles", () => {
  const result = classifyInbox(
    [candidate({ id: "e", title: "QA Engineer" }), candidate({ id: "l", title: "QA Lead" })],
    profile(),
    [],
    now,
  );
  assert.deepEqual(result.visible.map((row) => row.id), ["l", "e"]);
});

test("a software title is not hidden by description terms", () => {
  const verdict = judge(
    candidate({ title: "QA software", description: "FDA and MDR and ISO 13485" }),
    profile(),
    [],
    now,
  );
  assert.equal(verdict.softwareShaped, true);
  assert.equal(verdict.failed.includes("description"), false);
});

test("nav and schedule stay off until the admin flag is on", () => {
  assert.equal(mainNav(false).includes("/opportunities"), false);
  assert.equal(mainNav(true).includes("/opportunities"), true);
  assert.deepEqual(Object.keys(jobSearchPatch(true)), ["jobSearchEnabled"]);
  assert.equal(searchIsDue({ jobSearchEnabled: false, timeZone: "Asia/Jerusalem", lastRunAt: null, phase: null, now }), false);
  assert.equal(searchIsDue({ jobSearchEnabled: true, timeZone: "Asia/Jerusalem", lastRunAt: null, phase: "done", now }), true);
  assert.equal(
    searchIsDue({
      jobSearchEnabled: true,
      timeZone: "Asia/Jerusalem",
      lastRunAt: new Date("2026-10-27T11:00:00Z"),
      phase: "done",
      now,
    }),
    false,
  );
  assert.equal(searchIsDue({ jobSearchEnabled: true, timeZone: "Asia/Jerusalem", lastRunAt: now, phase: "boards", now }), true);
});

test("a reply older than the user's status does not apply, and the company must match", () => {
  assert.equal(replyShouldApply(new Date("2026-10-01"), new Date("2026-10-20")), false);
  assert.equal(replyShouldApply(new Date("2026-10-21"), new Date("2026-10-20")), true);
  const jobs = [{ companyName: "Acme", title: "QA Lead" }];
  assert.equal(matchKnownJob("Other", "QA Lead", jobs), null);
  assert.equal(matchKnownJob("Acme", "QA Lead", jobs)?.title, "QA Lead");
  assert.equal(matchKnownJob("", "QA Lead", jobs), null);
});
