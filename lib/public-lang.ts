import { cookies, headers } from "next/headers";
import { firstParam } from "./http";
import type { Lang } from "./i18n";

export function langFromAccept(header: string | null): Lang {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(";");
      const qParam = params.find((item) => item.trim().toLowerCase().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tagRaw.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag.startsWith("he")) return "he";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export async function publicLang(search: Record<string, string | string[] | undefined>): Promise<Lang> {
  const pinned = firstParam(search.lang);
  if (pinned === "en" || pinned === "he") return pinned;
  const jar = await cookies();
  const stored = jar.get("login_lang")?.value;
  if (stored === "he" || stored === "en") return stored;
  const headerList = await headers();
  return langFromAccept(headerList.get("accept-language"));
}
