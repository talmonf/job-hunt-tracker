import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProfileText } from "./parse-profile";
import { needsModel } from "./proposal";

const SAMPLE = `Ada Lovelace
Analytical engineer
About
Built engines of thought.
Experience
Analytical Engines
Mathematician
Jan 1843 - Present
Wrote notes on the engine
Translated the memoir
Education
University of Nowhere
Mathematics
1840 - 1842
Top Skills
Analysis
Poetry
`;

describe("profile pdf text", () => {
  it("reads a recognizable layout without a model", () => {
    const proposal = parseProfileText(SAMPLE);
    assert.equal(proposal.headline, "Analytical engineer");
    assert.match(proposal.aboutEn, /engines of thought/);
    assert.equal(proposal.employments.length, 1);
    assert.equal(proposal.employments[0].company, "Analytical Engines");
    assert.equal(proposal.employments[0].title, "Mathematician");
    assert.equal(proposal.employments[0].isCurrent, true);
    assert.equal(proposal.employments[0].startDate, "1843-01-01");
    assert.equal(proposal.employments[0].bullets.length, 2);
    assert.equal(proposal.educations[0].school, "University of Nowhere");
    assert.deepEqual(proposal.labels.map((label) => label.name), ["Analysis", "Poetry"]);
    assert.equal(needsModel(proposal, "en", 1), false);
  });

  it("asks for a model when the layout has no history or the other language is missing", () => {
    const thin = parseProfileText("Hello\nA short note with no roles.");
    assert.equal(needsModel(thin, "en", 1), true);
    const parsed = parseProfileText(SAMPLE);
    assert.equal(needsModel(parsed, "both", 1), true);
    assert.equal(needsModel(parsed, "en", 2), true);
  });

  it("keeps Hebrew bullets on the Hebrew side", () => {
    const proposal = parseProfileText(`שם
כותרת
ניסיון
חברה
תפקיד
ינואר 2020 - היום
כתב מערכות
`);
    assert.equal(proposal.employments[0].company, "חברה");
    assert.equal(proposal.employments[0].title, "תפקיד");
    assert.equal(proposal.employments[0].isCurrent, true);
    assert.equal(proposal.employments[0].bullets[0].textHe, "כתב מערכות");
    assert.equal(proposal.employments[0].bullets[0].textEn, "");
    assert.equal(needsModel(proposal, "he", 1), false);
  });
});
