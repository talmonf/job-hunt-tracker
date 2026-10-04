import { prisma } from "../prisma";

export const BUILTIN_PLATFORM_PROVIDERS = ["anthropic", "google", "openai"] as const;

export type BuiltinPlatformProvider = (typeof BUILTIN_PLATFORM_PROVIDERS)[number];

export function isBuiltinPlatformProvider(value: string): value is BuiltinPlatformProvider {
  return (BUILTIN_PLATFORM_PROVIDERS as readonly string[]).includes(value);
}

export function platformGrantAllows(provider: string, granted: readonly string[]): boolean {
  return isBuiltinPlatformProvider(provider) && granted.includes(provider);
}

export async function grantedPlatformProviders(userId: string): Promise<BuiltinPlatformProvider[]> {
  const rows = await prisma.platformKeyGrant.findMany({ where: { userId }, select: { provider: true } });
  return rows.flatMap((row) => (isBuiltinPlatformProvider(row.provider) ? [row.provider] : []));
}

export async function hasPlatformGrant(userId: string, provider: string): Promise<boolean> {
  if (!isBuiltinPlatformProvider(provider)) return false;
  const row = await prisma.platformKeyGrant.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { userId: true },
  });
  return row !== null;
}
