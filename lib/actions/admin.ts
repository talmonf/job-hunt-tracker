"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { requireAdmin } from "../session";
import { passwordRule } from "../password";
import { requiredText } from "../forms";

export async function createUser(formData: FormData) {
  const admin = await requireAdmin();
  const email = requiredText(formData.get("email")).toLowerCase();
  const fullName = requiredText(formData.get("fullName"));
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";
  const rule = passwordRule(password);
  if (!email.includes("@") || !fullName) redirect("/admin/users?error=required");
  if (rule) redirect(`/admin/users?error=policy&rule=${rule}`);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/admin/users?error=auth");
  await prisma.user.create({
    data: {
      email,
      fullName,
      role,
      passwordHash: await bcrypt.hash(password, 12),
      passwordChangedAt: new Date(),
      mustChangePassword: true,
      goals: { create: {} },
      profile: { create: {} },
    },
  });
  void admin;
  redirect("/admin/users?created=1");
}

export async function setUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = requiredText(formData.get("id"));
  if (id === admin.id) redirect("/admin/users?error=required");
  const active = formData.get("active") === "1";
  await prisma.user.updateMany({ where: { id }, data: { isActive: active } });
  redirect("/admin/users?updated=1");
}

export async function resetUserPassword(formData: FormData) {
  await requireAdmin();
  const id = requiredText(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  const rule = passwordRule(password);
  if (rule) redirect(`/admin/users?error=policy&rule=${rule}&modal=reset&id=${id}`);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
  });
  redirect("/admin/users?updated=1");
}
