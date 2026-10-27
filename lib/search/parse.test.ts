import assert from "node:assert/strict";
import test from "node:test";
import { detectBoard, parseAshby, parseComeet, parseGreenhouse, parseLever } from "./parse";
import { classifyReply, extractReplyTarget, parseAlertHtml } from "./mail-parse";

test("greenhouse, lever, ashby, and comeet payloads become postings", () => {
  const greenhouse = parseGreenhouse({
    jobs: [{ id: 7, title: "QA Lead", absolute_url: "https://boards.greenhouse.io/acme/jobs/7", location: { name: "Tel Aviv" }, content: "<p>Build tests</p>", first_published: "2026-10-01T00:00:00Z" }],
  });
  assert.equal(greenhouse[0]?.title, "QA Lead");
  assert.equal(greenhouse[0]?.location, "Tel Aviv");
  assert.match(greenhouse[0]?.description ?? "", /Build tests/);
  assert.equal(greenhouse[0]?.updatedOnly, false);

  const lever = parseLever([{ id: "abc", text: "QA Engineer", hostedUrl: "https://jobs.lever.co/acme/abc", categories: { location: "Haifa" }, descriptionPlain: "Tests", createdAt: 1760000000000 }]);
  assert.equal(lever[0]?.externalId, "abc");
  assert.equal(lever[0]?.location, "Haifa");

  const ashby = parseAshby({ jobs: [{ id: "j1", title: "Engineer", jobUrl: "https://jobs.ashbyhq.com/acme/j1", location: "Jerusalem", descriptionPlain: "Code", publishedAt: "2026-10-10T00:00:00Z" }] });
  assert.equal(ashby[0]?.url, "https://jobs.ashbyhq.com/acme/j1");

  const comeet = parseComeet({ positions: [{ uid: "p1", name: "QA Lead", url_comeet_hosted_page: "https://www.comeet.com/jobs/acme/41.00B/p1", location: { name: "Tel Aviv" }, description: "<p>Tests</p>", time_updated: "2026-10-12T00:00:00Z" }] });
  assert.equal(comeet[0]?.updatedOnly, true);
  assert.equal(comeet[0]?.externalId, "p1");
});

test("a pasted career link names the board", () => {
  assert.equal(detectBoard("https://job-boards.greenhouse.io/acme/jobs/7")?.externalKey, "acme");
  assert.equal(detectBoard("https://jobs.lever.co/acme/abc")?.provider, "lever");
  assert.equal(detectBoard("https://jobs.ashbyhq.com/acme/j1")?.provider, "ashby");
  assert.equal(detectBoard("https://www.comeet.com/jobs/vastdata/43.001/p1")?.externalKey, "vastdata/43.001");
  assert.equal(detectBoard("https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/x")?.provider, "workday");
  assert.equal(detectBoard("https://example.com/jobs"), null);
});

test("reply phrases in English and Hebrew, and a rejection wins over thanks", () => {
  const confirm = ["thank you for applying", "קיבלנו את מועמדותך"];
  const reject = ["not to move forward", "החלטנו שלא להמשיך"];
  assert.equal(classifyReply("Thank you for applying to Acme", confirm, reject), "applied");
  assert.equal(classifyReply("קיבלנו את מועמדותך למשרת QA", confirm, reject), "applied");
  assert.equal(classifyReply("Thank you for applying. We decided not to move forward.", confirm, reject), "rejected");
  assert.equal(classifyReply("החלטנו שלא להמשיך", confirm, reject), "rejected");
  assert.equal(classifyReply("Hello", confirm, reject), null);
  assert.deepEqual(extractReplyTarget("Thanks for applying for QA Lead at Acme", ""), { company: "Acme", title: "QA Lead" });
  assert.equal(extractReplyTarget("קיבלנו את מועמדותך למשרת בדיקות באקמי", "").company.length > 0, true);
});

test("an alert email yields one job per link", () => {
  const html = `<a href="https://www.linkedin.com/jobs/view/99?trk=1">QA Lead</a> Acme <a href="https://www.linkedin.com/jobs/view/99?trk=2">QA Lead</a>`;
  const jobs = parseAlertHtml({ from: "jobs-noreply@linkedin.com", html });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.externalId, "linkedin:99");
  assert.equal(jobs[0]?.israelAssumed, false);

  const alljobs = parseAlertHtml({ from: "alerts@alljobs.co.il", html: `<a href="https://www.alljobs.co.il/Search/UploadSingle.aspx?JobID=15">בודק תוכנה</a>` });
  assert.equal(alljobs[0]?.israelAssumed, true);
  assert.equal(alljobs[0]?.externalId, "alljobs:15");
});
