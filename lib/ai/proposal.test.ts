import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeProposal, readProposalForm } from "./proposal";

describe("profile import notes", () => {
  it("keeps createNote only when the checkbox is present and skips an empty extra role", () => {
    const form = new FormData();
    form.set("empCount", "2");
    form.set("emp_0_key", "e1");
    form.set("emp_0_title", "Mathematician");
    form.set("emp_0_company", "Analytical Engines");
    form.set("emp_0_note", "1");
    form.set("emp_0_bulletCount", "2");
    form.set("emp_0_b_0_en", "Wrote notes");
    form.set("emp_0_b_1_he", "כתבה הערות");
    form.set("emp_1_key", "extra-emp");
    form.set("emp_1_note", "1");
    form.set("emp_1_bulletCount", "1");
    const proposal = readProposalForm(form);
    assert.equal(proposal.employments.length, 1);
    assert.equal(proposal.employments[0].createNote, true);
    assert.equal(proposal.employments[0].title, "Mathematician");
  });

  it("leaves createNote false when the checkbox is absent", () => {
    const form = new FormData();
    form.set("empCount", "1");
    form.set("emp_0_title", "Mathematician");
    form.set("emp_0_company", "Analytical Engines");
    form.set("emp_0_bulletCount", "0");
    const proposal = readProposalForm(form);
    assert.equal(proposal.employments.length, 1);
    assert.equal(proposal.employments[0].createNote, false);
  });

  it("defaults a parsed role to a proposed note", () => {
    const proposal = normalizeProposal({ employments: [{ title: "Mathematician", company: "Analytical Engines" }] });
    assert.equal(proposal.employments[0].createNote, true);
    const declined = normalizeProposal({
      employments: [{ title: "Mathematician", company: "Analytical Engines", createNote: false }],
    });
    assert.equal(declined.employments[0].createNote, false);
  });
});
