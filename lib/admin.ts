export const BUILTIN_ADMIN_EMAIL = "talmonf@gmail.com";

export function isBuiltinAdmin(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === BUILTIN_ADMIN_EMAIL;
}
