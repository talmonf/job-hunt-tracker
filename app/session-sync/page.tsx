"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SyncInner() {
  const { update, status } = useSession();
  const params = useSearchParams();
  useEffect(() => {
    if (status !== "authenticated") return;
    const next = params.get("next") || "/dashboard";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    update().then(() => {
      window.location.href = safe;
    });
  }, [status, update, params]);
  return <p className="p-8 text-slate-300">Continuing…</p>;
}

export default function SessionSyncPage() {
  return (
    <Suspense>
      <SyncInner />
    </Suspense>
  );
}
