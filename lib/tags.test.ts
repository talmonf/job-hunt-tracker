import assert from "node:assert/strict";
import test from "node:test";
import { rankByOverlap, type TagRef } from "./tags";

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

test("overlap ranking is empty when nothing is selected", () => {
  const ranked = rankByOverlap([{ name: "Alpha", tags: [platform] }], (item) => item.tags, [], (item) => item.name);
  assert.deepEqual(ranked, []);
});
