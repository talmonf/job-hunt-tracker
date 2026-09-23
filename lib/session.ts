import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "./prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.passwordActionRequired) redirect("/change-password");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function hidePersonalInfo(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("session_obfuscate")?.value === "1";
}
