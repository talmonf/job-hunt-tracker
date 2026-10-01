import assert from "node:assert/strict";
import test from "node:test";
import { firstFreeTagColor, parseTagMatch, rankByOverlap, suggestTagColors, tagFilter, type TagRef } from "./tags";

const platform: TagRef = { id: "platform", name: "platform", color: "sky" };
const leadership: TagRef = { id: "leadership", name: "leadership", color: "amber" };
const hebrew: TagRef = { id: "hebrew", name: "hebrew", color: "emerald" };

test("overlap ranking prefers more shared tags, then name", () => {
  const items = [
    { name: "Beta", tags: [platform] },
    { name: "Alpha", tags: [leadership] },
    { name: "Gamma", tags: [platform, leadership] },
    { name: "Delta", tags: [hebrew] },
  ];
  const ranked = rankByOverlap(
    items,
    (item) => item.tags,
    [platform.id, leadership.id],
    (item) => item.name,
  );
  assert.deepEqual(
    ranked.map((row) => row.item.name),
    ["Gamma", "Alpha", "Beta"],
  );
  assert.deepEqual(
    ranked[0].overlap.map((tag) => tag.id),
    ["platform", "leadership"],
  );
});

test("new tags suggest five colors that are not already used", () => {
  assert.deepEqual(suggestTagColors([], "red"), ["red", "yellow", "green", "blue", "purple"]);
  assert.deepEqual(firstFreeTagColor(["red", "rose"]), "pink");
  assert.deepEqual(suggestTagColors(["red", "rose", "pink"], "fuchsia"), ["yellow", "green", "blue", "violet", "fuchsia"]);
});

test("a palette color stays visible when it is outside the five suggestions", () => {
  assert.deepEqual(suggestTagColors([], "orange"), ["orange", "lime", "green", "blue", "purple"]);
});

test("an empty tag selection applies no tag filter", () => {
  assert.deepEqual(tagFilter([], "any"), {});
  assert.deepEqual(tagFilter([], "all"), {});
});

test("selected tags match any tag unless the match is all", () => {
  assert.equal(parseTagMatch(""), "any");
  assert.equal(parseTagMatch("all"), "all");
  assert.equal(parseTagMatch("other"), "any");
  assert.deepEqual(tagFilter(["platform", "leadership"], "any"), {
    tags: { some: { tagId: { in: ["platform", "leadership"] } } },
  });
  assert.deepEqual(tagFilter(["platform", "leadership"], "all"), {
    AND: [{ tags: { some: { tagId: "platform" } } }, { tags: { some: { tagId: "leadership" } } }],
  });
});

test("overlap ranking is empty when nothing is selected", () => {
  const ranked = rankByOverlap([{ name: "Alpha", tags: [platform] }], (item) => item.tags, [], (item) => item.name);
  assert.deepEqual(ranked, []);
});
