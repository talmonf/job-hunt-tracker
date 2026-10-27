"use client";

import { useEffect, useState, useTransition } from "react";
import { setJobSearchEnabled } from "@/lib/actions/admin";

export function JobSearchUserCheck({
  id,
  checked,
  label,
}: {
  id: string;
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
            await setJobSearchEnabled(id, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
