import assert from "node:assert/strict";
import test from "node:test";
import { formatProcessProgress, nextStep, processProgress, resolveMediumLabel, stepTiming } from "./process-steps";

const parts = { empty: "Add the stages for this application", doneOf: "done", next: "Next" };

test("next stage is the first unfinished step in order", () => {
  const steps = [
    { id: "b", position: 2, completedAt: null },
    { id: "a", position: 1, completedAt: new Date("2026-10-01T10:00:00.000Z") },
    { id: "c", position: 3, completedAt: null },
  ];
  assert.equal(nextStep(steps)?.id, "b");
});

test("no next stage when every step is done", () => {
  assert.equal(nextStep([{ id: "a", position: 1, completedAt: new Date("2026-10-01T10:00:00.000Z") }]), null);
});

test("progress line names the next stage and its time", () => {
  const when = new Date("2026-10-16T07:00:00.000Z");
  const progress = processProgress([
    { position: 1, label: "Phone", completedAt: new Date("2026-10-01T10:00:00.000Z"), scheduledAt: null },
    { position: 2, label: "Zoom interview", completedAt: null, scheduledAt: when },
    { position: 4, label: "Panel", completedAt: null, scheduledAt: null },
    { position: 3, label: "Assignment", completedAt: null, scheduledAt: null },
  ]);
  assert.deepEqual(progress, { kind: "next", done: 1, total: 4, label: "Zoom interview", scheduledAt: when });
  assert.equal(
    formatProcessProgress(progress, { ...parts, when: "16 Oct 10:00" }),
    "1/4 done · Next: Zoom interview · 16 Oct 10:00",
  );
});

test("progress line omits the time when the next stage is not scheduled", () => {
  const progress = processProgress([{ position: 1, label: "משימת בית", completedAt: null, scheduledAt: null }]);
  assert.equal(formatProcessProgress(progress, parts), "0/1 done · Next: משימת בית");
});

test("progress line reports every stage done", () => {
  const progress = processProgress([
    { position: 1, label: "A", completedAt: new Date("2026-10-01T10:00:00.000Z"), scheduledAt: null },
    { position: 2, label: "B", completedAt: new Date("2026-10-02T10:00:00.000Z"), scheduledAt: null },
  ]);
  assert.equal(formatProcessProgress(progress, parts), "2/2 done");
});

test("an empty process asks for stages", () => {
  assert.equal(formatProcessProgress(processProgress([]), parts), parts.empty);
});

test("custom medium text is kept and presets resolve", () => {
  const labels: Record<string, string> = { phone: "Phone", video: "Video" };
  assert.equal(resolveMediumLabel("phone", (key) => labels[key]), "Phone");
  assert.equal(resolveMediumLabel("Zoom", (key) => labels[key]), "Zoom");
  assert.equal(resolveMediumLabel("  ", (key) => labels[key]), "");
});

test("a past time stays unfinished until checked off", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");
  assert.equal(stepTiming({ completedAt: null, scheduledAt: new Date("2026-10-01T12:00:00.000Z") }, now), "passed");
  assert.equal(stepTiming({ completedAt: null, scheduledAt: new Date("2026-10-20T12:00:00.000Z") }, now), "scheduled");
  assert.equal(stepTiming({ completedAt: null, scheduledAt: null }, now), "todo");
  assert.equal(stepTiming({ completedAt: new Date("2026-10-02T12:00:00.000Z"), scheduledAt: new Date("2026-10-01T12:00:00.000Z") }, now), "done");
});
