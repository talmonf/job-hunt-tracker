import { auth } from "@/auth";
import { readStored } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { kind, id } = await context.params;
  const record =
    kind === "cv"
      ? await prisma.jobCv.findFirst({ where: { id, job: { userId: session.user.id } } })
      : kind === "profile"
        ? await prisma.profileFile.findFirst({ where: { id, userId: session.user.id } })
        : null;
  if (!record) return new Response("Not found", { status: 404 });
  const bytes = await readStored(session.user.id, record.objectKey);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": record.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.filename)}"`,
    },
  });
}
