export const PROCESS_MEDIA = ["phone", "video", "in_person", "assignment", "presentation"] as const;
export type ProcessMedium = (typeof PROCESS_MEDIA)[number];

export const PROCESS_LABEL_MAX = 200;
export const PROCESS_MEDIUM_MAX = 80;
export const PROCESS_WITH_MAX = 200;
export const PROCESS_NOTES_MAX = 4000;

export const CUSTOM_MEDIUM = "custom";

export type StepTiming = "done" | "scheduled" | "passed" | "todo";

export type ProcessProgress =
  | { kind: "empty" }
  | { kind: "complete"; done: number; total: number }
  | { kind: "next"; done: number; total: number; label: string; scheduledAt: Date | null };

export function isPresetMedium(value: string): value is ProcessMedium {
  return (PROCESS_MEDIA as readonly string[]).includes(value);
}

export function sortSteps<T extends { position: number }>(steps: readonly T[]): T[] {
  return [...steps].sort((a, b) => a.position - b.position);
}

export function nextStep<T extends { position: number; completedAt: Date | null }>(steps: readonly T[]): T | null {
  return sortSteps(steps).find((step) => !step.completedAt) ?? null;
}

export function stepTiming(step: { completedAt: Date | null; scheduledAt: Date | null }, now: Date): StepTiming {
  if (step.completedAt) return "done";
  if (!step.scheduledAt) return "todo";
  return step.scheduledAt.getTime() < now.getTime() ? "passed" : "scheduled";
}

export function processProgress(
  steps: readonly { position: number; label: string; completedAt: Date | null; scheduledAt: Date | null }[],
): ProcessProgress {
  if (steps.length === 0) return { kind: "empty" };
  const ordered = sortSteps(steps);
  const done = ordered.filter((step) => step.completedAt).length;
  const upcoming = ordered.find((step) => !step.completedAt);
  if (!upcoming) return { kind: "complete", done, total: ordered.length };
  return {
    kind: "next",
    done,
    total: ordered.length,
    label: upcoming.label,
    scheduledAt: upcoming.scheduledAt,
  };
}

export function formatProcessProgress(
  progress: ProcessProgress,
  parts: { empty: string; doneOf: string; next: string; when?: string },
  maskLabel: (label: string) => string = (label) => label,
): string {
  if (progress.kind === "empty") return parts.empty;
  const head = `${progress.done}/${progress.total} ${parts.doneOf}`;
  if (progress.kind === "complete") return head;
  const line = `${head} · ${parts.next}: ${maskLabel(progress.label)}`;
  if (!progress.scheduledAt || !parts.when) return line;
  return `${line} · ${parts.when}`;
}

/** Preset keys resolve through the lookup. Anything else, including a typed medium, is returned as written. */
export function resolveMediumLabel(medium: string, presetLabel: (key: string) => string | undefined): string {
  const trimmed = medium.trim();
  if (!trimmed) return "";
  return presetLabel(trimmed) ?? trimmed;
}
