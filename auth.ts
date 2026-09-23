import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";
import { passwordActionRequired } from "./lib/password";
import type { Role } from "@prisma/client";

const credentialProvider = Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.isActive || !user.passwordHash) return null;
      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        passwordActionRequired: passwordActionRequired(user),
      };
    },
  });

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: googleProvider ? [credentialProvider, googleProvider] : [credentialProvider],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified === false) return false;
      const jar = await cookies();
      const lang = jar.get("login_lang")?.value === "he" ? "he" : "en";
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (!existing.isActive) return false;
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleAccountId: existing.googleAccountId ?? account.providerAccountId,
            uiLanguage: lang,
          },
        });
        return true;
      }
      await prisma.user.create({
        data: {
          email,
          fullName: profile?.name || email,
          googleAccountId: account.providerAccountId,
          role: "user",
          isActive: true,
          uiLanguage: lang,
          goals: { create: {} },
          profile: { create: {} },
        },
      });
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (user && account?.provider === "credentials") {
        const credentialsUser = user as typeof user & {
          role?: Role;
          passwordActionRequired?: boolean;
        };
        token.sub = credentialsUser.id;
        token.role = credentialsUser.role ?? "user";
        token.passwordActionRequired = Boolean(credentialsUser.passwordActionRequired);
        token.name = credentialsUser.name;
        token.email = credentialsUser.email;
        token.invalid = false;
        token.checkedAt = Date.now();
        return token;
      }
      if (account?.provider === "google") {
        const email = (profile?.email || (typeof token.email === "string" ? token.email : "")).toLowerCase();
        const dbUser = email ? await prisma.user.findUnique({ where: { email } }) : null;
        if (!dbUser?.isActive) {
          token.invalid = true;
          return token;
        }
        token.sub = dbUser.id;
        token.role = dbUser.role;
        token.name = dbUser.fullName;
        token.email = dbUser.email;
        token.passwordActionRequired = passwordActionRequired(dbUser);
        token.invalid = false;
        token.checkedAt = Date.now();
        return token;
      }
      const stale = !token.checkedAt || Date.now() - Number(token.checkedAt) > 30 * 60 * 1000;
      if (token.sub && (trigger === "update" || stale || token.passwordActionRequired)) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
        if (!dbUser?.isActive) {
          token.invalid = true;
          return token;
        }
        token.role = dbUser.role;
        token.name = dbUser.fullName;
        token.email = dbUser.email;
        token.passwordActionRequired = passwordActionRequired(dbUser);
        token.invalid = false;
        token.checkedAt = Date.now();
      }
      return token;
    },
  },
});
