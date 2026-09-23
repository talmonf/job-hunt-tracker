export function maskText(value: string | null | undefined, hide: boolean): string {
  if (value === null || value === undefined) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return value;
  if (!hide) return value;
  return "••••";
}

export function dash(value: string | null | undefined, hide: boolean): string {
  if (!value || !value.trim()) return "—";
  return maskText(value, hide);
}
