import assert from "node:assert/strict";
import test from "node:test";
import { applyParserSkills } from "./draft";
import { normalizeProposal } from "./proposal";

test("a model payload cannot replace parser skills", () => {
  const parsed = [
    normalizeProposal({
      skills: ["Cursor AI", "AI Pair Programming / AI-Assisted Programming", "Product Design"],
    }),
    normalizeProposal({ skills: ["product design", "SQL"] }),
  ];
  const model = normalizeProposal(
    {
      skills: ["Cursor AI", "Programming", "Invented"],
      employments: [{ key: "e1", title: "PM", company: "Acme", bullets: [] }],
    },
    true,
  );
  const result = applyParserSkills(model, parsed);
  assert.deepEqual(result.skills, [
    "Cursor AI",
    "AI Pair Programming / AI-Assisted Programming",
    "Product Design",
    "SQL",
  ]);
  assert.equal(result.employments[0]?.title, "PM");
  assert.equal(result.usedModel, true);
});

test("an older draft keeps skill names and drops themes", () => {
  const proposal = normalizeProposal({
    labels: [
      { kind: "skill", name: "Cursor AI" },
      { kind: "theme", name: "Leadership" },
    ],
    flavors: [{ name: "Builder", employmentKeys: [], bulletKeys: [], labelKeys: [] }],
  });
  assert.deepEqual(proposal.skills, ["Cursor AI"]);
});
