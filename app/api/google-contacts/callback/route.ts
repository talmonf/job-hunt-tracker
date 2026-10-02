import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(new URL("/settings?error=contacts", url.origin));
  if (!session?.user?.id) return fail();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [cookieState, userId] = state.split(":");
  const jar = await cookies();
  if (!code || !cookieState || cookieState !== jar.get("gcontacts_state")?.value || userId !== session.user.id) return fail();
  jar.delete("gcontacts_state");
  const redirectUri = `${process.env.AUTH_URL || url.origin}/api/google-contacts/callback`;
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
  if (!(await grantsContacts(tokens.scope, tokens.access_token))) {
    return NextResponse.redirect(new URL("/settings?error=contacts-scope", url.origin));
  }
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
    data: { contactsRefreshToken: encryptSecret(tokens.refresh_token), contactsEmail: email },
  });
  return NextResponse.redirect(new URL("/settings?updated=1", url.origin));
}

async function grantsContacts(scope: string | undefined, accessToken: string | undefined): Promise<boolean> {
  const listed = (scope ?? "").split(/\s+/).filter(Boolean);
  if (listed.some((item) => item.includes("/auth/contacts"))) return true;
  if (listed.length || !accessToken) return false;
  const info = await fetch("https://oauth2.googleapis.com/tokeninfo", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken }),
  });
  if (!info.ok) return false;
  const body = (await info.json()) as { scope?: string };
  return (body.scope ?? "").split(/\s+/).some((item) => item.includes("/auth/contacts"));
}
