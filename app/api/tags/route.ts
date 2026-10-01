import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTag, deleteTag, updateTag, type TagWriteResult } from "@/lib/actions/tags";
import { prisma } from "@/lib/prisma";

async function activeUserId() {
  const session = await auth();
  if (!session?.user?.id || session.passwordActionRequired) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isActive: true } });
  if (!user?.isActive) return null;
  return user.id;
}

function writeResponse(result: TagWriteResult) {
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "tagName" ? 409 : 400 });
  return NextResponse.json({ tag: result.tag });
}

export async function POST(request: Request) {
  const userId = await activeUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  return writeResponse(await createTag(userId, await request.formData()));
}

export async function PATCH(request: Request) {
  const userId = await activeUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  return writeResponse(await updateTag(userId, await request.formData()));
}

export async function DELETE(request: Request) {
  const userId = await activeUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const result = await deleteTag(userId, await request.formData());
  if (!result.ok && result.error === "used") return NextResponse.json({ error: "used", usage: result.usage }, { status: 409 });
  if (!result.ok && result.error === "confirm") return NextResponse.json({ error: "confirm" }, { status: 409 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
