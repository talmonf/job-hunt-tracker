import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
