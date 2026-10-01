"use client";

import { useState } from "react";
import type { ChipLink } from "@/lib/entity-links";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { addEntityLink, deleteEntityLink } from "@/lib/actions/links";
import { ContactChip } from "./contact-chip";
import { PersonPicker, type LocalPerson, type PickedPerson } from "./person-picker";
import { SettingsSection } from "./settings-section";
import { quietButton } from "./widgets";

export function EntityLinksSection({
  lang,
  hide,
  links,
  jobId,
  noteId,
  parentContactId,
  localContacts,
  googleConnected,
  allowUrl = false,
  title,
  collapsible = false,
}: {
  lang: Lang;
  hide: boolean;
  links: ChipLink[];
  jobId?: string;
  noteId?: string;
  parentContactId?: string;
  localContacts: LocalPerson[];
  googleConnected: boolean;
  allowUrl?: boolean;
  title?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);

  async function pick(person: PickedPerson) {
    const data = new FormData();
    if (jobId) data.set("jobId", jobId);
    if (noteId) data.set("noteId", noteId);
    if (parentContactId) data.set("parentContactId", parentContactId);
    data.set("kind", person.kind);
    data.set("displayName", person.displayName);
    data.set("title", person.title);
    if (person.googleResourceName) data.set("googleResourceName", person.googleResourceName);
    if (person.url) data.set("url", person.url);
    if (person.contactId) data.set("contactId", person.contactId);
    await addEntityLink(data);
  }

  const heading = title ?? t(lang, "peopleLinks");
  const body = (
    <>
      <div className={collapsible ? "mb-2 flex justify-end" : "mb-2 flex items-center justify-between gap-3"}>
        {collapsible ? null : <h2 className="text-lg">{heading}</h2>}
        <button className={quietButton} type="button" onClick={() => setOpen((value) => !value)}>
          {t(lang, "addPerson")}
        </button>
      </div>
      {links.length ? (
        <ul className="flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.id ?? `${link.kind}-${link.displayName}`} className="flex items-center gap-1">
              <ContactChip link={link} hide={hide} />
              {link.id ? (
                <form action={deleteEntityLink}>
                  <input type="hidden" name="linkId" value={link.id} />
                  <button className="text-xs text-rose-300" type="submit" aria-label={t(lang, "delete")}>
                    ×
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">{t(lang, "noPeople")}</p>
      )}
      {open ? (
        <div className="mt-3">
          <PersonPicker
            lang={lang}
            localContacts={localContacts}
            googleConnected={googleConnected}
            allowUrl={allowUrl}
            onPick={pick}
          />
        </div>
      ) : null}
    </>
  );
  if (collapsible) {
    return (
      <SettingsSection title={heading} badge={String(links.length)}>
        {body}
      </SettingsSection>
    );
  }
  return <section className="mt-8">{body}</section>;
}
