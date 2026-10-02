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
  if (!email.includes("@") || !fullName) authFailure(formData, "signup", { error: "required" });
  if (rule) authFailure(formData, "signup", { error: "policy", rule });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) authFailure(formData, "signup", { error: "auth" });
  const jar = await cookies();
  const lang = chosenLang(formData, jar.get("login_lang")?.value);
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
      authFailure(formData, "login", { error: "auth" });
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    authFailure(formData, "login", { error: "auth" });
  }
  const jar = await cookies();
  const lang = chosenLang(formData, jar.get("login_lang")?.value);
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

function chosenLang(formData: FormData, stored: string | undefined) {
  const posted = formData.get("ui_language");
  if (posted === "he" || posted === "en") return posted;
  return stored === "he" ? "he" : "en";
}

function authFailure(formData: FormData, page: "login" | "signup", query: Record<string, string>): never {
  const params = new URLSearchParams(query);
  if (formData.get("surface") === "home") {
    params.set("panel", page);
    redirect(`/?${params.toString()}`);
  }
  if (page === "login") params.set("callbackUrl", safeCallback(String(formData.get("callbackUrl") ?? "")));
  redirect(`/${page}?${params.toString()}`);
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
