import assert from "node:assert/strict";
import test from "node:test";
import { firstFreeTagColor, hexToHsv, hexToRgb, hsvToHex, normalizeTagColor, parseTagMatch, rankByOverlap, suggestTagColors, TAG_PALETTE, tagFilter, type TagRef } from "./tags";

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

const palette = Object.fromEntries(TAG_PALETTE.map((item) => [item.id, item.hex])) as Record<(typeof TAG_PALETTE)[number]["id"], string>;

test("new tags suggest five colors that are easy to tell apart", () => {
  assert.deepEqual(suggestTagColors([], palette.red), [palette.red, palette.yellow, palette.green, palette.blue, palette.magenta]);
  assert.equal(firstFreeTagColor([palette.red, palette.orange]), palette.green);
  assert.equal(firstFreeTagColor(["red"]), palette.yellow);
});

test("a palette color stays visible when it is outside the five quick swatches", () => {
  const picks = suggestTagColors([], palette.orange);
  assert.equal(picks.length, 5);
  assert.ok(picks.includes(palette.orange));
  assert.equal(picks.includes(palette.red), false);
  assert.equal(picks.includes(palette.yellow), false);
});

test("a custom color stays in the quick swatches", () => {
  const picks = suggestTagColors([], "#112233");
  assert.equal(picks.length, 5);
  assert.ok(picks.includes("#112233"));
});

test("tag colors accept hex and rgb and keep the old named swatches", () => {
  assert.equal(normalizeTagColor("#abc"), "#aabbcc");
  assert.equal(normalizeTagColor("EF4444"), "#ef4444");
  assert.equal(normalizeTagColor("rgb(255, 128, 0)"), "#ff8000");
  assert.equal(normalizeTagColor("rgb(255 0 16)"), "#ff0010");
  assert.equal(normalizeTagColor("red"), "#f87171");
  assert.equal(normalizeTagColor("rgb(256, 0, 0)"), null);
  assert.equal(normalizeTagColor("nope"), null);
});

test("palette swatches round-trip through the color field", () => {
  for (const item of TAG_PALETTE) {
    const hsv = hexToHsv(item.hex);
    assert.ok(hsv);
    const back = hsvToHex(hsv.h, hsv.s, hsv.v);
    const left = [1, 3, 5].map((index) => Number.parseInt(item.hex.slice(index, index + 2), 16));
    const right = [1, 3, 5].map((index) => Number.parseInt(back.slice(index, index + 2), 16));
    assert.ok(left.every((channel, index) => Math.abs(channel - right[index]) <= 1), `${item.id} ${item.hex} -> ${back}`);
  }
});

test("basic swatches are not the same color", () => {
  function distance(a: string, b: string) {
    const left = hexToRgb(a);
    const right = hexToRgb(b);
    assert.ok(left && right);
    return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
  }
  for (let i = 0; i < TAG_PALETTE.length; i += 1) {
    for (let j = i + 1; j < TAG_PALETTE.length; j += 1) {
      const gap = distance(TAG_PALETTE[i].hex, TAG_PALETTE[j].hex);
      assert.ok(gap >= 60, `${TAG_PALETTE[i].id} ~ ${TAG_PALETTE[j].id} (${gap.toFixed(1)})`);
    }
  }
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
