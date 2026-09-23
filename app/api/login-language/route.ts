import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  const jar = await cookies();
  const pinned = jar.get("login_lang_pinned")?.value === "1";
  const cookieLang = jar.get("login_lang")?.value === "he" ? "he" : "en";
  if (pinned || !email.includes("@")) return Response.json({ lang: cookieLang });
  const user = await prisma.user.findUnique({ where: { email }, select: { uiLanguage: true } });
  if (!user) return Response.json({ lang: cookieLang });
  jar.set("login_lang", user.uiLanguage, { path: "/", sameSite: "lax" });
  return Response.json({ lang: user.uiLanguage });
}
