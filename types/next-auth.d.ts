import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    passwordActionRequired?: boolean;
    user: {
      id: string;
      role: "user" | "admin";
    } & import("next-auth").DefaultSession["user"];
  }
  interface User {
    role?: "user" | "admin";
    passwordActionRequired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "user" | "admin";
    passwordActionRequired?: boolean;
    invalid?: boolean;
    checkedAt?: number;
  }
}
