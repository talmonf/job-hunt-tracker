import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { workArrangementLabel } from "../i18n";
import { normalizeJobDetails } from "./job-details";

const catalog = [
  { id: "t1", name: "React" },
  { id: "t2", name: "Backend" },
];

describe("job details from a description", () => {
  it("keeps stated fields and drops invalid enums", () => {
    const result = normalizeJobDetails(
      {
        companyName: "  Northwind ",
        title: "Engineer",
        location: "Haifa",
        employmentType: "full_time",
        workArrangement: "hybrid",
        engagement: "contract",
        extra: "ignored",
      },
      catalog,
    );
    assert.deepEqual(result.fields, {
      companyName: "Northwind",
      title: "Engineer",
      location: "Haifa",
      employmentType: "full_time",
      workArrangement: "hybrid",
      hybridNote: "",
      engagement: "employee",
    });
  });

  it("defaults employment and engagement when the posting does not state them", () => {
    const result = normalizeJobDetails(
      { companyName: "Hello Heart", employmentType: "", workArrangement: "office", engagement: "contract" },
      [],
    );
    assert.deepEqual(result.fields, {
      companyName: "Hello Heart",
      title: "",
      location: "",
      employmentType: "full_time",
      workArrangement: "",
      hybridNote: "",
      engagement: "employee",
    });
  });

  it("keeps stated part-time, remote, and freelance values", () => {
    const result = normalizeJobDetails(
      { employmentType: "part_time", workArrangement: "remote", engagement: "freelance" },
      [],
    );
    assert.equal(result.fields.employmentType, "part_time");
    assert.equal(result.fields.workArrangement, "remote");
    assert.equal(result.fields.hybridNote, "");
    assert.equal(result.fields.engagement, "freelance");
  });

  it("leaves company, title, and location blank when the model returns nothing usable", () => {
    const result = normalizeJobDetails({ companyName: 12, employmentType: "", tagNames: "React" }, []);
    assert.deepEqual(result.fields, {
      companyName: "",
      title: "",
      location: "",
      employmentType: "full_time",
      workArrangement: "",
      hybridNote: "",
      engagement: "employee",
    });
    assert.deepEqual(result.tagIds, []);
    assert.deepEqual(result.proposedTags, []);
  });

  it("matches existing tags without proposing them, and caps new names", () => {
    const names = ["react", "React", " ", "Go", "go", "Fintech", "a", "b", "c", "d", "e", "f", "g"];
    const result = normalizeJobDetails({ tagNames: names }, catalog);
    assert.deepEqual(result.tagIds, ["t1"]);
    assert.deepEqual(result.proposedTags, ["Go", "Fintech", "a", "b", "c", "d", "e", "f", "g"]);
  });

  it("keeps at most 20 new tag names", () => {
    const names = Array.from({ length: 21 }, (_, index) => `Tag ${index + 1}`);
    const result = normalizeJobDetails({ tagNames: names }, []);
    assert.equal(result.proposedTags.length, 20);
    assert.equal(result.proposedTags[0], "Tag 1");
    assert.equal(result.proposedTags[19], "Tag 20");
  });

  it("keeps a hybrid schedule phrase and drops it otherwise", () => {
    const hybrid = normalizeJobDetails({ workArrangement: "hybrid", hybridNote: "  3 days in office  " }, []);
    assert.equal(hybrid.fields.workArrangement, "hybrid");
    assert.equal(hybrid.fields.hybridNote, "3 days in office");

    const remote = normalizeJobDetails({ workArrangement: "remote", hybridNote: "3 days in office" }, []);
    assert.equal(remote.fields.hybridNote, "");

    const capped = normalizeJobDetails({ workArrangement: "hybrid", hybridNote: "x".repeat(250) }, []);
    assert.equal(capped.fields.hybridNote.length, 200);
  });
});

describe("work arrangement label", () => {
  it("puts a hybrid note in brackets", () => {
    assert.equal(workArrangementLabel("en", "hybrid", "3 days in office"), "Hybrid (3 days in office)");
    assert.equal(workArrangementLabel("he", "hybrid", "3 ימים במשרד"), "היברידי (3 ימים במשרד)");
    assert.equal(workArrangementLabel("en", "hybrid", "  "), "Hybrid");
    assert.equal(workArrangementLabel("en", "remote", "3 days in office"), "Remote");
  });
});
