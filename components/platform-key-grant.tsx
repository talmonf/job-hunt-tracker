"use client";

import { useEffect, useState, useTransition } from "react";
import { setPlatformKeyGrant } from "@/lib/actions/admin";
import type { BuiltinPlatformProvider } from "@/lib/ai/platform-access";

export function PlatformKeyGrantCheck({
  userId,
  provider,
  checked,
  label,
}: {
  userId: string;
  provider: BuiltinPlatformProvider;
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
            await setPlatformKeyGrant(userId, provider, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
