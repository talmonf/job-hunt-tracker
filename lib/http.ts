export function safeCallback(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/dashboard";
  return value;
}

export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function allParams(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export function safeStoredName(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").replace(/[^\w.\-\u0590-\u05FF ]+/g, "_").slice(0, 80);
  return base || "file";
}

export function preserveQuery(
  search: Record<string, string | string[] | undefined>,
  extras: Record<string, string> = {},
  drop: string[] = [],
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (drop.includes(key) || key in extras) continue;
    const list = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of list) params.append(key, item);
  }
  for (const [key, value] of Object.entries(extras)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
