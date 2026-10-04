"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sameLinkIdentity, type ChipLink } from "@/lib/entity-links";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { addEntityLink, deleteEntityLink } from "@/lib/actions/links";
import { ContactChip } from "./contact-chip";
import { PersonPicker, type BlockedPeople, type LocalPerson, type PickedPerson } from "./person-picker";
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
  const [chosen, setChosen] = useState<PickedPerson | null>(null);
  const [linking, startLinking] = useTransition();
  const linkingRef = useRef(false);
  const wasLinking = useRef(false);
  const shownLinks = chosen && !links.some((link) => sameLinkIdentity(link, chosen)) ? [...links, toPendingChip(chosen)] : links;

  useEffect(() => {
    if (wasLinking.current && !linking) {
      linkingRef.current = false;
      setChosen(null);
    }
    wasLinking.current = linking;
  }, [linking]);

  function pick(person: PickedPerson) {
    if (linkingRef.current || linking) return;
    if (shownLinks.some((link) => sameLinkIdentity(link, person))) {
      setOpen(false);
      return;
    }
    linkingRef.current = true;
    setChosen(person);
    setOpen(false);
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
    startLinking(async () => {
      try {
        await addEntityLink(data);
      } catch (error) {
        if (!isRedirectError(error)) {
          linkingRef.current = false;
          setChosen(null);
        }
        throw error;
      }
    });
  }

  const heading = title ?? t(lang, "peopleLinks");
  const body = (
    <>
      <div className={collapsible ? "mb-2 flex items-center justify-end gap-3" : "mb-2 flex items-center justify-between gap-3"}>
        {collapsible ? null : <h2 className="text-lg">{heading}</h2>}
        <div className="flex items-center gap-3">
          {chosen ? (
            <p className="flex items-center gap-2 text-sm text-sky-300" role="status" aria-live="polite">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              {t(lang, "linkingPerson").replace("{name}", chosen.displayName)}
            </p>
          ) : null}
          <button
            className={`${quietButton} disabled:cursor-wait disabled:opacity-60`}
            type="button"
            disabled={Boolean(chosen) || linking}
            aria-busy={Boolean(chosen) || linking}
            onClick={() => setOpen((value) => !value)}
          >
            {t(lang, "addPerson")}
          </button>
        </div>
      </div>
      {shownLinks.length ? (
        <ul className="flex flex-wrap gap-2">
          {shownLinks.map((link) => (
            <li key={link.id ?? `pending-${link.contactId ?? link.googleResourceName ?? link.url ?? link.displayName}`} className={`flex items-center gap-1 ${link.id ? "" : "opacity-70"}`}>
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
      {open && !chosen && !linking ? (
        <div className="mt-3">
          <PersonPicker
            lang={lang}
            localContacts={localContacts}
            googleConnected={googleConnected}
            allowUrl={allowUrl}
            blocked={blockedPeople(shownLinks)}
            onPick={pick}
          />
        </div>
      ) : null}
    </>
  );
  if (collapsible) {
    return (
      <SettingsSection title={heading} badge={String(shownLinks.length)}>
        {body}
      </SettingsSection>
    );
  }
  return <section className="mt-8">{body}</section>;
}

function toPendingChip(person: PickedPerson): ChipLink {
  return {
    kind: person.kind,
    displayName: person.displayName,
    title: person.title,
    googleResourceName: person.googleResourceName,
    url: person.url,
    contactId: person.contactId,
  };
}

function blockedPeople(list: ChipLink[]): BlockedPeople {
  return {
    contactIds: list.flatMap((link) => (link.contactId ? [link.contactId] : [])),
    resourceNames: list.flatMap((link) => (link.googleResourceName ? [link.googleResourceName] : [])),
    urls: list.flatMap((link) => (link.url?.trim() ? [link.url.trim()] : [])),
  };
}
