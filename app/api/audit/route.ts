import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseActivityEvent } from "@/lib/audit-path";
import { recordActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

const MAX_EVENTS = 10;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) return NextResponse.json({ error: "auth" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const events = body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)
    ? (body as { events: unknown[] }).events
    : null;
  if (!events || events.length === 0 || events.length > MAX_EVENTS) {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const parsed = events.flatMap((event) => {
    const row = parseActivityEvent(event);
    return row ? [row] : [];
  });
  if (parsed.length > 0) await recordActivity(user.id, parsed);
  return NextResponse.json({ ok: true });
}
