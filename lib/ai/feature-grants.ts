import { prisma } from "../prisma";
import { fillAccess, sponsoredProvider, type FillAccess, type SponsoredFeature } from "./feature-access";
import { platformKey, type AiProviderId } from "./providers";

export async function hasFeatureGrant(userId: string, feature: SponsoredFeature): Promise<boolean> {
  const row = await prisma.aiFeatureGrant.findUnique({
    where: { userId_feature: { userId, feature } },
    select: { userId: true },
  });
  return row !== null;
}

export async function resolveSponsoredProvider(userId: string, feature: SponsoredFeature): Promise<AiProviderId | null> {
  if (!(await hasFeatureGrant(userId, feature))) return null;
  return sponsoredProvider((provider) => Boolean(platformKey(provider)));
}

export async function loadJobFillAccess(userId: string): Promise<FillAccess> {
  const [sponsored, keyCount] = await Promise.all([
    resolveSponsoredProvider(userId, "job-details"),
    prisma.aiProviderKey.count({ where: { userId } }),
  ]);
  return fillAccess({ sponsored: sponsored !== null, hasOwnKey: keyCount > 0 });
}
