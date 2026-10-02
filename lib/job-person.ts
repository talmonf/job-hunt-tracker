export const WORKS_THERE = ["yes", "no", "past"] as const;
export type WorksThere = (typeof WORKS_THERE)[number];

export const JOB_CONNECTIONS = ["works_there", "worked_there", "on_the_board", "provides_services"] as const;
export type JobConnection = (typeof JOB_CONNECTIONS)[number];

const EMPLOYMENT_CONNECTIONS = new Set<string>(["works_there", "worked_there"]);

export function normalizeWorksThere(value: string): WorksThere | "" {
  return (WORKS_THERE as readonly string[]).includes(value) ? (value as WorksThere) : "";
}

export function normalizeConnection(value: string): JobConnection | "" {
  return (JOB_CONNECTIONS as readonly string[]).includes(value) ? (value as JobConnection) : "";
}

export function connectionForWorksThere(worksThere: string, current: string): string {
  if (worksThere === "yes") return "works_there";
  if (worksThere === "past") return "worked_there";
  if (worksThere === "no" && EMPLOYMENT_CONNECTIONS.has(current)) return "";
  return current;
}
