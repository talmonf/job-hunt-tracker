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
    assert.equal(proposal.employments[0].startDate, "01/1843");
    assert.equal(proposal.employments[0].endDate, "");
    assert.equal(proposal.educations[0].degree, "Mathematics");
    assert.equal(proposal.educations[0].startDate, "1840");
    assert.equal(proposal.educations[0].endDate, "1842");
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

  it("reads a LinkedIn export with wrapped lines and repeated employers", () => {
    const proposal = parseProfileText(`Certifications
Mixpanel Advanced Analytics
Course
Talmon Friedlander
Senior Product Manager | Product Builder | Digital Health & AI |
Enterprise SaaS | PM Leadership
Israel
Summary
Builds products.
Experience
Air Doctor
Senior Product Manager
October 2024 - September 2026 (2 years)
Israel
• Worked across both sides of the platform
Materials Zone
Senior Product Manager
August 2022 - October 2024 (2 years 3 months)
Tel Aviv District, Israel
• Built the product function
Accruent
6 years
R&D Manager
November 2018 - August 2022 (3 years 10 months)
Israel
• Built and maintained a SQL-based monitoring system to detect integration
and platform issues in production, expanding coverage with each new issue
class discovered
Senior Product Manager
September 2016 - October 2018 (2 years 2 months)
Jerusalem District, Israel
• Owned product requirements and roadmap
ViryaNet
7 years 11 months
VP, Products
January 2010 - July 2014 (4 years 7 months)
Jerusalem
• Managed 2 PMs over 4+ years, establishing PM craft standards across
discovery, prioritization and stakeholder management
Senior Product Manager
September 2006 - January 2010 (3 years 5 months)
Jerusalem
• Owned full product lifecycle from inception to launch
Education
The Hebrew University of Jerusalem
Master of Social Work (MSW) · (October 2019 - October 2022)
University of South Africa/Universiteit van Suid-Afrika
Bachelor of Science (B.Sc.), Mathematics and Computer Science · (January
1992 - December 1994)
`);
    assert.equal(
      proposal.headline,
      "Senior Product Manager | Product Builder | Digital Health & AI | Enterprise SaaS | PM Leadership",
    );
    assert.deepEqual(
      proposal.certificates.map((row) => row.name),
      ["Mixpanel Advanced Analytics Course"],
    );
    assert.equal(proposal.certificates[0].issuer, "");
    assert.deepEqual(
      proposal.employments.map((row) => [row.company, row.title, row.startDate, row.endDate]),
      [
        ["Air Doctor", "Senior Product Manager", "10/2024", "09/2026"],
        ["Materials Zone", "Senior Product Manager", "08/2022", "10/2024"],
        ["Accruent", "R&D Manager", "11/2018", "08/2022"],
        ["Accruent", "Senior Product Manager", "09/2016", "10/2018"],
        ["ViryaNet", "VP, Products", "01/2010", "07/2014"],
        ["ViryaNet", "Senior Product Manager", "09/2006", "01/2010"],
      ],
    );
    assert.equal(
      proposal.employments[2].bullets.at(-1)?.textEn,
      "Built and maintained a SQL-based monitoring system to detect integration and platform issues in production, expanding coverage with each new issue class discovered",
    );
    assert.equal(proposal.employments[2].bullets.some((bullet) => bullet.textEn === "Accruent"), false);
    assert.equal(proposal.employments[3].bullets[0].textEn, "Owned product requirements and roadmap");
    assert.equal(
      proposal.employments[4].bullets[0].textEn,
      "Managed 2 PMs over 4+ years, establishing PM craft standards across discovery, prioritization and stakeholder management",
    );
    assert.deepEqual(
      proposal.educations.map((row) => [row.school, row.degree, row.field, row.startDate, row.endDate]),
      [
        ["The Hebrew University of Jerusalem", "Master of Social Work (MSW)", "", "10/2019", "10/2022"],
        [
          "University of South Africa/Universiteit van Suid-Afrika",
          "Bachelor of Science (B.Sc.)",
          "Mathematics and Computer Science",
          "01/1992",
          "12/1994",
        ],
      ],
    );
  });

  it("joins wrapped lines into sentences", () => {
    const proposal = parseProfileText(`Experience
Self-Employed
Product Builder
March 2026 - Present
I own the full 0→1 cycle solo, from requirements and design through hands-on.
AI-assisted development to analytics that show what people actually use.
Home Finance Management: Application to track household finances,
with reminder emails and Google Calendar integration. A bootstrapping
RiseUp import (linked bank accounts and credit cards) automatically creates
the underlying entities (bank accounts, credit cards, insurance policies).
`);
    assert.deepEqual(
      proposal.employments[0].bullets.map((bullet) => bullet.textEn),
      [
        "I own the full 0→1 cycle solo, from requirements and design through hands-on.",
        "AI-assisted development to analytics that show what people actually use.",
        "Home Finance Management: Application to track household finances, with reminder emails and Google Calendar integration.",
        "A bootstrapping RiseUp import (linked bank accounts and credit cards) automatically creates the underlying entities (bank accounts, credit cards, insurance policies).",
      ],
    );
  });
});
