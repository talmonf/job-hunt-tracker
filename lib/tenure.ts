export type Tenure = {
  startedOn: string;
  startedUnknown: boolean;
  endedOn: string;
  endedUnknown: boolean;
};

export function tenureLabel(tenure: Tenure, labels: { unknown: string; present: string }): string {
  const hasFrom = tenure.startedUnknown || tenure.startedOn.trim().length > 0;
  const hasTo = tenure.endedUnknown || tenure.endedOn.trim().length > 0;
  if (!hasFrom && !hasTo) return "";
  const from = tenure.startedUnknown ? labels.unknown : tenure.startedOn.trim() || "—";
  const to = tenure.endedUnknown ? labels.unknown : tenure.endedOn.trim() || labels.present;
  return `${from} – ${to}`;
}
