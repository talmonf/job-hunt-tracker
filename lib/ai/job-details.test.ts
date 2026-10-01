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
      engagement: "",
    });
  });

  it("leaves every field blank when the model returns nothing usable", () => {
    const result = normalizeJobDetails({ companyName: 12, employmentType: "", tagNames: "React" }, []);
    assert.deepEqual(result.fields, {
      companyName: "",
      title: "",
      location: "",
      employmentType: "",
      workArrangement: "",
      engagement: "",
    });
    assert.deepEqual(result.tagIds, []);
    assert.deepEqual(result.proposedTags, []);
  });

  it("matches existing tags without proposing them, and caps new names", () => {
    const names = ["react", "React", " ", "Go", "go", "Fintech", "a", "b", "c", "d", "e", "f", "g"];
    const result = normalizeJobDetails({ tagNames: names }, catalog);
    assert.deepEqual(result.tagIds, ["t1"]);
    assert.deepEqual(result.proposedTags, ["Go", "Fintech", "a", "b", "c", "d", "e", "f"]);
    assert.equal(result.proposedTags.length, 8);
  });
});
