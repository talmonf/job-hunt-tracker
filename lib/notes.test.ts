import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { employmentNoteLabel, experienceNoteBodies, noteTypesFor, subjectKind, subjectValue } from "./notes";

describe("work experience notes", () => {
  it("treats a profile role as its own subject", () => {
    assert.equal(subjectKind("employment:role1"), "employment");
    assert.equal(subjectValue({ employmentId: "role1" }), "employment:role1");
    assert.equal(subjectValue({ jobId: "job1", employmentId: "role1" }), "job:job1");
    assert.deepEqual(noteTypesFor("employment"), ["work_experience"]);
    assert.equal(noteTypesFor("general").includes("work_experience"), true);
    assert.equal(noteTypesFor("job").includes("work_experience"), false);
    assert.equal(noteTypesFor("contact").includes("work_experience"), false);
    assert.equal(noteTypesFor("company").includes("work_experience"), false);
  });

  it("builds the note title and bodies from the role", () => {
    assert.equal(employmentNoteLabel({ title: "Mathematician", company: "Analytical Engines" }), "Mathematician — Analytical Engines");
    assert.equal(employmentNoteLabel({ title: "Mathematician", company: "  " }), "Mathematician");
    assert.deepEqual(
      experienceNoteBodies([
        { textEn: "Wrote notes", textHe: "" },
        { textEn: "  ", textHe: "כתבה הערות" },
      ]),
      { bodyEn: "Wrote notes", bodyHe: "כתבה הערות" },
    );
  });
});
