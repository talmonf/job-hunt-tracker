import { cookies } from "next/headers";
import { firstParam } from "./http";
import type { Lang } from "./i18n";

export async function publicLang(search: Record<string, string | string[] | undefined>): Promise<Lang> {
  const pinned = firstParam(search.lang);
  if (pinned === "en" || pinned === "he") return pinned;
  const jar = await cookies();
  return jar.get("login_lang")?.value === "he" ? "he" : "en";
}
