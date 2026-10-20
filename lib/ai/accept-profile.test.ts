import assert from "node:assert/strict";
import test from "node:test";
import { planProfileImport } from "./accept-profile";
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

test("flavors link saved rows, and a repeated skill is stored once", () => {
  const plan = planProfileImport(
    "user-1",
    proposal({
      employments: [
        {
          key: "e1",
          title: "Mathematician",
          company: "Acme",
          startDate: "",
          endDate: "",
          isCurrent: false,
          createNote: false,
          bullets: [{ key: "b1", textEn: "Proofs", textHe: "" }],
        },
      ],
      labels: [
        { key: "l1", kind: "skill", name: "Algebra" },
        { key: "l2", kind: "skill", name: "Algebra" },
        { key: "l3", kind: "theme", name: "Algebra" },
      ],
      flavors: [
        {
          key: "f1",
          name: "Research",
          employmentKeys: ["e1", "missing", "e1"],
          bulletKeys: ["b1"],
          labelKeys: ["l1", "l2", "l3"],
        },
      ],
    }),
    "UTC",
    ids(),
  );

  assert.deepEqual(
    plan.labels.map((label) => ({ id: label.id, kind: label.kind, name: label.name })),
    [
      { id: "id-3", kind: "skill", name: "Algebra" },
      { id: "id-4", kind: "theme", name: "Algebra" },
    ],
  );
  assert.equal(plan.flavors[0]?.id, "id-5");
  assert.deepEqual(plan.flavorEmployments, [{ flavorId: "id-5", employmentId: "id-1" }]);
  assert.deepEqual(plan.flavorBullets, [{ flavorId: "id-5", bulletId: "id-2" }]);
  assert.deepEqual(plan.flavorLabels, [
    { flavorId: "id-5", labelId: "id-3" },
    { flavorId: "id-5", labelId: "id-4" },
  ]);
});
