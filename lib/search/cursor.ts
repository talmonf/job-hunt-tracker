export type SearchStats = {
  boardsOk: number;
  boardsFailed: number;
  newPostings: number;
  mailRead: number;
  repliesApplied: number;
  repliesUnmatched: number;
};

export type SearchCursor = {
  phase: "boards" | "mail" | "done";
  index: number;
  force: boolean;
  stats: SearchStats;
  startedAt: string;
  finishedAt?: string;
  mailError?: string;
};

export function parseCursor(raw: string): SearchCursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SearchCursor;
    if (value.phase !== "boards" && value.phase !== "mail" && value.phase !== "done") return null;
    if (!value.stats) return null;
    return value;
  } catch {
    return null;
  }
}
