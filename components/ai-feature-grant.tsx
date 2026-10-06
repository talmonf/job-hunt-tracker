"use client";

import { useEffect, useState, useTransition } from "react";
import { setAiFeatureGrant } from "@/lib/actions/admin";
import type { SponsoredFeature } from "@/lib/ai/feature-access";

export function AiFeatureGrantCheck({
  userId,
  feature,
  checked,
  label,
}: {
  userId: string;
  feature: SponsoredFeature;
  checked: boolean;
  label: string;
}) {
  const [on, setOn] = useState(checked);
  const [pending, startTransition] = useTransition();

  useEffect(() => setOn(checked), [checked]);

  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-sky-500 disabled:opacity-50"
      checked={on}
      disabled={pending}
      aria-label={label}
      onChange={(event) => {
        const next = event.target.checked;
        setOn(next);
        startTransition(async () => {
          try {
            await setAiFeatureGrant(userId, feature, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
