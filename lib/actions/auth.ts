"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/auth";
import { prisma } from "../prisma";
import { passwordActionRequired, passwordRule } from "../password";
import { safeCallback } from "../http";
import { auth } from "@/auth";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const rule = passwordRule(password);
  if (!email.includes("@") || !fullName) redirect("/signup?error=required");
  if (rule) redirect(`/signup?error=policy&rule=${rule}`);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=auth");
  const jar = await cookies();
  const lang = jar.get("login_lang")?.value === "he" ? "he" : "en";
  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await bcrypt.hash(password, 12),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      uiLanguage: lang,
      goals: { create: {} },
      profile: { create: {} },
    },
  });
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callback = safeCallback(String(formData.get("callbackUrl") ?? ""));
  try {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result && "error" in result && result.error) {
      redirect(`/login?error=auth&callbackUrl=${encodeURIComponent(callback)}`);
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(`/login?error=auth&callbackUrl=${encodeURIComponent(callback)}`);
  }
  const jar = await cookies();
  const lang = jar.get("login_lang")?.value === "he" ? "he" : "en";
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { uiLanguage: lang } });
    if (passwordActionRequired(user)) redirect("/change-password");
  }
  redirect(callback);
}

export async function googleSignIn(formData: FormData) {
  const callback = safeCallback(String(formData.get("callbackUrl") ?? "/dashboard"));
  await signIn("google", { redirectTo: callback });
}

export async function signOutAction() {
  const jar = await cookies();
  jar.delete("session_obfuscate");
  await signOut({ redirectTo: "/" });
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const needsCurrent = Boolean(user.passwordHash);
  if ((needsCurrent && !current) || !next || !confirm) redirect("/change-password?error=empty");
  if (next !== confirm) redirect("/change-password?error=mismatch");
  if (needsCurrent && next === current) redirect("/change-password?error=same");
  if (needsCurrent && user.passwordHash && !(await bcrypt.compare(current, user.passwordHash))) {
    redirect("/change-password?error=current");
  }
  const rule = passwordRule(next);
  if (rule) redirect(`/change-password?error=policy&rule=${rule}`);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(next, 12),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
  redirect("/session-sync?next=/dashboard");
}

export async function setLoginLanguage(formData: FormData) {
  const lang = formData.get("ui_language") === "he" ? "he" : "en";
  const jar = await cookies();
  jar.set("login_lang", lang, { path: "/", sameSite: "lax" });
  jar.set("login_lang_pinned", "1", { path: "/", sameSite: "lax" });
  const returnTo = String(formData.get("returnTo") ?? "/");
  redirect(returnTo.startsWith("/") ? returnTo : "/");
}

export async function setUserLanguage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const lang = formData.get("ui_language") === "he" ? "he" : "en";
  await prisma.user.update({ where: { id: session.user.id }, data: { uiLanguage: lang } });
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  redirect(returnTo.startsWith("/") ? returnTo : "/dashboard");
}

export async function setObfuscate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const jar = await cookies();
  if (formData.get("value") === "1") {
    jar.set("session_obfuscate", "1", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    jar.delete("session_obfuscate");
  }
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  redirect(returnTo.startsWith("/") ? returnTo : "/dashboard");
}
