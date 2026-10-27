import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);
  const fail = (error = "gmail") => NextResponse.redirect(new URL(`/opportunities/settings?error=${error}`, url.origin));
  if (!session?.user?.id) return fail();
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { jobSearchEnabled: true } });
  if (!user?.jobSearchEnabled) return NextResponse.redirect(new URL("/dashboard", url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [cookieState, userId] = state.split(":");
  const jar = await cookies();
  if (!code || !cookieState || cookieState !== jar.get("gmail_state")?.value || userId !== session.user.id) return fail();
  jar.delete("gmail_state");
  const redirectUri = `${process.env.AUTH_URL || url.origin}/api/google-gmail/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return fail();
  const tokens = (await tokenResponse.json()) as { refresh_token?: string; access_token?: string; scope?: string };
  if (!tokens.refresh_token) return fail();
  const scopes = (tokens.scope ?? "").split(/\s+/);
  if (!scopes.some((scope) => scope.includes("gmail.readonly"))) return fail("gmail-scope");
  let email = "";
  if (tokens.access_token) {
    const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (profile.ok) {
      const body = (await profile.json()) as { email?: string };
      email = body.email ?? "";
    }
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { gmailRefreshToken: encryptSecret(tokens.refresh_token), gmailEmail: email },
  });
  return NextResponse.redirect(new URL("/opportunities/settings?updated=1", url.origin));
}
