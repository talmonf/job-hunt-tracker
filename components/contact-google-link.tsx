"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { linkContactGoogle, unlinkContactGoogle } from "@/lib/actions/links";
import { ContactChip } from "./contact-chip";
import { PersonPicker, type PickedPerson } from "./person-picker";
import { quietButton } from "./widgets";

export function ContactGoogleLink({
  lang,
  hide,
  contactId,
  fullName,
  role,
  googleResourceName,
  googleConnected,
}: {
  lang: Lang;
  hide: boolean;
  contactId: string;
  fullName: string;
  role: string;
  googleResourceName: string | null;
  googleConnected: boolean;
}) {
  const [open, setOpen] = useState(false);

  async function pick(person: PickedPerson) {
    if (person.kind !== "google_contact" || !person.googleResourceName) return;
    const data = new FormData();
    data.set("contactId", contactId);
    data.set("googleResourceName", person.googleResourceName);
    data.set("title", person.title);
    data.set("workplace", person.workplace ?? "");
    await linkContactGoogle(data);
  }

  return (
    <div className="rounded-md border border-slate-700 p-3">
      <p className="mb-2 text-sm text-slate-300">{t(lang, "googleContacts")}</p>
      {googleResourceName ? (
        <div className="flex flex-wrap items-center gap-3">
          <ContactChip
            hide={hide}
            link={{
              kind: "google_contact",
              displayName: fullName,
              title: role,
              googleResourceName,
            }}
          />
          <span className="text-xs text-slate-400">{t(lang, "googleContactLinked")}</span>
          <form action={unlinkContactGoogle}>
            <input type="hidden" name="contactId" value={contactId} />
            <button className="text-sm text-rose-300" type="submit">
              {t(lang, "unlinkGoogleContact")}
            </button>
          </form>
        </div>
      ) : googleConnected ? (
        <>
          <button className={quietButton} type="button" onClick={() => setOpen((value) => !value)}>
            {t(lang, "linkGoogleContact")}
          </button>
          {open ? (
            <div className="mt-3">
              <PersonPicker
                lang={lang}
                localContacts={[]}
                googleConnected
                googleOnly
                onPick={pick}
              />
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-400">{t(lang, "googleContactsHint")}</p>
      )}
    </div>
  );
}
