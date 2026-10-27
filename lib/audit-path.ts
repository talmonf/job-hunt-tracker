export const ACTIVITY_PATH_MAX = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID = /^c[0-9a-z]{24}$/i;
const LONG_ID = /^[0-9a-z]{20,}$/i;

export type ActivityKindName = "page" | "click";
export type ClickControl = "link" | "button" | "submit" | "summary";

export type ActivityInput = {
  kind: ActivityKindName;
  path: string;
  control: "" | ClickControl;
  target: string;
};

/** In-app path with id segments replaced. Query strings, hashes, and addresses are dropped. */
export function normalizePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const withoutHash = trimmed.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  if (/[\s\\@]/.test(withoutQuery) || /[\u0000-\u001f]/.test(withoutQuery)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("..")) return null;
  if (decoded.includes("@") || decoded.includes("\\") || /[^\x21-\x7e]/.test(decoded)) return null;

  const segments = decoded.split("/");
  const kept: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    if (!segment) {
      if (index === segments.length - 1) continue;
      return null;
    }
    if (segment === ":id" || UUID.test(segment) || CUID.test(segment) || LONG_ID.test(segment)) {
      kept.push(":id");
      continue;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
    kept.push(segment);
  }
  const path = `/${kept.join("/")}`;
  if (path.length > ACTIVITY_PATH_MAX) return null;
  if (path.startsWith("/api/") || path === "/api" || path.startsWith("/_next/") || path === "/_next") return null;
  return path;
}

/** Link destination: an in-app path, or "external" with no address. */
export function clickTarget(href: string, pagePath: string, origin?: string): string {
  const page = normalizePath(pagePath) ?? "/";
  const raw = href.trim();
  if (!raw || raw.startsWith("#")) return page;
  if (raw.startsWith("//")) return "external";
  if (/^(mailto:|tel:|sms:)/i.test(raw)) return "external";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "external";
      if (origin && url.origin === origin) return normalizePath(url.pathname) ?? "external";
    } catch {
      return "external";
    }
    return "external";
  }
  try {
    const resolved = new URL(raw, `http://audit.local${page}`);
    return normalizePath(resolved.pathname) ?? "external";
  } catch {
    return "external";
  }
}

export function controlFromTag(tag: string, type: string | null, role: string | null): ClickControl | null {
  const name = tag.toLowerCase();
  if (name === "a") return "link";
  if (name === "summary") return "summary";
  const controlType = type?.toLowerCase() ?? "";
  if (name === "input") return controlType === "submit" ? "submit" : null;
  if (name === "button") return controlType === "submit" ? "submit" : "button";
  if (role === "button") return "button";
  return null;
}

export function parseActivityEvent(input: unknown): ActivityInput | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const path = typeof row.path === "string" ? normalizePath(row.path) : null;
  if (!path) return null;
  if (row.kind === "page") return { kind: "page", path, control: "", target: "" };
  if (row.kind !== "click") return null;
  const control = row.control;
  if (control !== "link" && control !== "button" && control !== "submit" && control !== "summary") return null;
  if (control === "link") {
    if (row.target === "external") return { kind: "click", path, control, target: "external" };
    const target = typeof row.target === "string" ? normalizePath(row.target) : null;
    if (!target) return null;
    return { kind: "click", path, control, target };
  }
  return { kind: "click", path, control, target: path };
}
