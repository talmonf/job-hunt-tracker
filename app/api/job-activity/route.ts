import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo } from "@/lib/session";
import { applyDirectStatusChange, eventFormCatalog, persistEvent } from "@/lib/event-write";

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id || session.passwordActionRequired) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive) return null;
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const catalog = await eventFormCatalog(user, await hidePersonalInfo());
  return NextResponse.json(catalog);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "status") {
    const result = await applyDirectStatusChange(user, formData);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (intent === "event") {
    const result = await persistEvent(user, formData);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({
      ok: true,
      status: result.status,
      event: result.event,
      warn: result.calendarFailed ? "calendar" : undefined,
    });
  }
  return NextResponse.json({ error: "required" }, { status: 400 });
}
