import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { contactsAccessToken, searchGooglePeople } from "@/lib/google-contacts";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!user.contactsRefreshToken) return NextResponse.json({ people: [], connected: false });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const access = await contactsAccessToken(user.contactsRefreshToken);
  if (!access.accessToken) {
    return NextResponse.json({ people: [], connected: true, error: access.error ?? "refresh" }, { status: 502 });
  }
  try {
    const result = await searchGooglePeople(access.accessToken, query);
    const status = result.error ? 502 : 200;
    return NextResponse.json({ people: result.people, connected: true, error: result.error, helpUrl: result.helpUrl }, { status });
  } catch {
    return NextResponse.json({ people: [], connected: true, error: "google" }, { status: 502 });
  }
}
