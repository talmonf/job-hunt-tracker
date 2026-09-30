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
  const token = await contactsAccessToken(user.contactsRefreshToken);
  if (!token) return NextResponse.json({ people: [], connected: true, error: "token" }, { status: 502 });
  const people = await searchGooglePeople(token, query);
  return NextResponse.json({ people, connected: true });
}
