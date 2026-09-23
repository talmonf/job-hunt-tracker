import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 2,
    updateAge: 60 * 30,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.invalid || !token.sub) {
        session.user.id = "";
        session.passwordActionRequired = false;
        return session;
      }
      session.user.id = token.sub;
      session.user.role = token.role === "admin" ? "admin" : "user";
      session.user.name = token.name ?? "";
      session.user.email = typeof token.email === "string" ? token.email : "";
      session.passwordActionRequired = Boolean(token.passwordActionRequired);
      return session;
    },
  },
} satisfies NextAuthConfig;
