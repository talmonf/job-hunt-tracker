export function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("json");
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}
