import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exportWorkbook } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.passwordActionRequired) {
    return new Response("Unauthorized", { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return new Response("Unauthorized", { status: 401 });
  const buffer = await exportWorkbook(user.id, user.timezone);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=mentme-export.xlsx",
    },
  });
}
