"use client";

import { useEffect, useState, useTransition } from "react";
import { setCompanyFollowing } from "@/lib/actions/companies";
import { t, type Lang } from "@/lib/i18n";

export function CompanyFollowingToggle({
  companyId,
  following,
  lang,
}: {
  companyId: string;
  following: boolean;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState(following);
  useEffect(() => setChecked(following), [following]);

  return (
    <input
      type="checkbox"
      aria-label={t(lang, "following")}
      checked={checked}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.checked;
        setChecked(next);
        const data = new FormData();
        data.set("companyId", companyId);
        data.set("following", next ? "1" : "0");
        start(() => {
          void setCompanyFollowing(data);
        });
      }}
    />
  );
}
