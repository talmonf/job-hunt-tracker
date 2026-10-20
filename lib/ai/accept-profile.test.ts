import assert from "node:assert/strict";
import test from "node:test";
import { planProfileImport, resolveSkillTags } from "./accept-profile";
import { emptyProposal, type Proposal } from "./proposal";

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

function proposal(patch: Partial<Proposal> = {}): Proposal {
  return { ...emptyProposal(), ...patch };
}

test("a profile import plans one note per selected role and reuses company names", () => {
  const plan = planProfileImport(
    "user-1",
    proposal({
      employments: [
        {
          key: "e1",
          title: "Mathematician",
          company: " Acme ",
          startDate: "01/2020",
          endDate: "2024",
          isCurrent: false,
          createNote: true,
          bullets: [
            { key: "b1", textEn: "Wrote notes", textHe: "" },
            { key: "b2", textEn: "", textHe: "כתבה" },
          ],
        },
        {
          key: "e2",
          title: "Advisor",
          company: "acme",
          startDate: "",
          endDate: "06/2024",
          isCurrent: true,
          createNote: false,
          bullets: [],
        },
      ],
    }),
    "UTC",
    ids(),
  );

  assert.equal(plan.employments.length, 2);
  assert.equal(plan.employments[0]?.id, "id-1");
  assert.equal(plan.employments[0]?.title, "Mathematician");
  assert.equal(plan.employments[0]?.company, " Acme ");
  assert.equal(plan.employments[0]?.descriptionEn, "Wrote notes");
  assert.equal(plan.employments[0]?.descriptionHe, "כתבה");
  const ended = plan.employments[0]?.endDate;
  assert.ok(ended instanceof Date);
  assert.equal(ended.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(plan.employments[1]?.endDate, null);
  assert.equal(plan.employments[1]?.isCurrent, true);
  assert.deepEqual(plan.companies, ["Acme"]);
  assert.deepEqual(
    plan.bullets.map((bullet) => bullet.id),
    ["id-2", "id-3"],
  );
  assert.equal(plan.notes.length, 1);
  assert.equal(plan.notes[0]?.title, "Mathematician — Acme");
  assert.equal(plan.notes[0]?.employmentId, "id-1");
  assert.equal(plan.notes[0]?.type, "work_experience");
  assert.equal(plan.notes[0]?.bodyEn, "Wrote notes");
  assert.equal(plan.notes[0]?.bodyHe, "כתבה");
});

test("a repeated skill is stored once, and an existing tag is reused", () => {
  const plan = planProfileImport(
    "user-1",
    proposal({
      skills: ["Algebra", " algebra ", "Proofs"],
    }),
    "UTC",
    ids(),
  );
  assert.deepEqual(plan.skillNames, ["Algebra", "Proofs"]);

  const linked = resolveSkillTags(
    plan.skillNames,
    [{ id: "tag-algebra", name: "algebra", color: "red" }],
    ids(),
  );
  assert.deepEqual(linked.tagIds, ["tag-algebra", "id-1"]);
  assert.deepEqual(linked.create, [{ id: "id-1", name: "Proofs", color: "rose" }]);
});
