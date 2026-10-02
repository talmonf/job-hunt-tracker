"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { isHttpUrl, kindFromUrl, labelFromUrl, type EntityLinkKind } from "@/lib/entity-links";
import type { GooglePerson } from "@/lib/google-person";
import { fieldClass, labelClass, primaryButton, quietButton } from "./widgets";

export type LocalPerson = {
  id: string;
  fullName: string;
  role: string;
  workplace?: string;
  googleResourceName?: string | null;
  linkedinUrl?: string;
};

export type PickedPerson = {
  kind: EntityLinkKind;
  displayName: string;
  title: string;
  workplace?: string;
  googleResourceName?: string;
  givenName?: string;
  familyName?: string;
  firstName?: string;
  lastName?: string;
  firstNameHe?: string;
  lastNameHe?: string;
  linkedinUrl?: string;
  mobile?: string;
  email?: string;
  address?: string;
  url?: string;
  contactId?: string;
};

type GoogleHit = GooglePerson;

type SearchError = "" | "config" | "refresh" | "scope" | "api" | "google";

function searchErrorCode(value: string | undefined): SearchError {
  if (value === "config" || value === "refresh" || value === "scope" || value === "api" || value === "google") return value;
  return value ? "google" : "";
}

function PhraseLink({ text, token, label, href }: { text: string; token: string; label: string; href: string }) {
  const link = (
    <Link className="text-sky-300 underline" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </Link>
  );
  const index = text.indexOf(token);
  if (index < 0) {
    return (
      <>
        {text} {link}
      </>
    );
  }
  return (
    <>
      {text.slice(0, index)}
      {link}
      {text.slice(index + token.length)}
    </>
  );
}

function SearchErrorLine({ lang, error }: { lang: Lang; error: SearchError }) {
  if (error === "config") return t(lang, "googleContactsMissing");
  if (error === "refresh" || error === "scope") {
    return (
      <PhraseLink
        text={t(lang, "errorGoogleContactsRelink")}
        token="{settings}"
        label={t(lang, "settings")}
        href="/settings?section=google#google"
      />
    );
  }
  if (error === "api") return t(lang, "errorGoogleContactsApi");
  return t(lang, "errorGoogleContactsSearch");
}

export function PersonPicker({
  lang,
  localContacts,
  googleConnected,
  allowUrl = false,
  googleOnly = false,
  hideUrl = false,
  onPick,
}: {
  lang: Lang;
  localContacts: LocalPerson[];
  googleConnected: boolean;
  allowUrl?: boolean;
  googleOnly?: boolean;
  hideUrl?: boolean;
  onPick: (person: PickedPerson) => void;
}) {
  const [query, setQuery] = useState("");
  const [googleHits, setGoogleHits] = useState<GoogleHit[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<SearchError>("");
  const q = query.trim().toLowerCase();

  const locals = useMemo(() => {
    if (googleOnly) return [];
    const list = q
      ? localContacts.filter((contact) =>
          [contact.fullName, contact.role, contact.workplace ?? ""].join(" ").toLowerCase().includes(q),
        )
      : localContacts;
    return list.slice(0, 8);
  }, [googleOnly, localContacts, q]);

  useEffect(() => {
    if (!googleConnected || q.length < 2) {
      setGoogleHits([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/google-contacts/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const json = (await response.json()) as { people?: GoogleHit[]; error?: string };
        if (controller.signal.aborted) return;
        const people = json.people ?? [];
        setGoogleHits(people);
        setSearchError(people.length === 0 ? searchErrorCode(json.error) : "");
      } catch {
        if (controller.signal.aborted) return;
        setGoogleHits([]);
        setSearchError("google");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [googleConnected, q, query]);

  function submitUrl() {
    const href = url.trim();
    const kind = kindFromUrl(href);
    if (!kind) return;
    if (kind === "url" && !allowUrl) return;
    onPick({
      kind,
      displayName: name.trim() || labelFromUrl(href),
      title: title.trim(),
      url: href,
    });
    setUrl("");
    setName("");
    setTitle("");
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-700 p-3">
      <label>
        <span className={labelClass}>{t(lang, "searchPeople")}</span>
        <input
          className={fieldClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(lang, "searchPeople")}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </label>
      {!googleOnly ? (
        <ResultGroup
          label={t(lang, "localContacts")}
          empty={locals.length === 0}
        >
          {locals.map((contact) => (
            <button
              key={contact.id}
              className="block w-full truncate rounded px-2 py-1 text-start text-sm hover:bg-slate-800"
              type="button"
              onClick={() =>
                onPick({
                  kind: "local_contact",
                  displayName: contact.fullName,
                  title: contact.role,
                  workplace: contact.workplace,
                  contactId: contact.id,
                  googleResourceName: contact.googleResourceName ?? undefined,
                  url: contact.linkedinUrl,
                })
              }
            >
              {contact.fullName}
              {contact.role ? <span className="text-slate-400"> · {contact.role}</span> : null}
            </button>
          ))}
        </ResultGroup>
      ) : null}
      {googleConnected ? (
        <ResultGroup
          label={t(lang, "googleResults")}
          empty={!searching && !searchError && googleHits.length === 0 && q.length >= 2}
        >
          {searching ? <p className="px-2 py-1 text-xs text-slate-400">{t(lang, "continuing")}</p> : null}
          {searchError && !searching ? (
            <p className="px-2 py-1 text-xs text-rose-300">
              <SearchErrorLine lang={lang} error={searchError} />
            </p>
          ) : null}
          {googleHits.map((person) => (
            <button
              key={person.resourceName}
              className="block w-full truncate rounded px-2 py-1 text-start text-sm hover:bg-slate-800"
              type="button"
              onClick={() =>
                onPick({
                  kind: "google_contact",
                  displayName: person.displayName,
                  title: person.title,
                  workplace: person.workplace,
                  googleResourceName: person.resourceName,
                  givenName: person.givenName,
                  familyName: person.familyName,
                  firstName: person.firstName,
                  lastName: person.lastName,
                  firstNameHe: person.firstNameHe,
                  lastNameHe: person.lastNameHe,
                  linkedinUrl: person.linkedinUrl,
                  mobile: person.mobile,
                  email: person.email,
                  address: person.address,
                })
              }
            >
              {person.displayName}
              {person.title ? <span className="text-slate-400"> · {person.title}</span> : null}
            </button>
          ))}
        </ResultGroup>
      ) : null}
      {hideUrl ? null : (
        <div className="grid gap-2 md:grid-cols-3">
          <label className="md:col-span-3">
            <span className={labelClass}>{allowUrl ? t(lang, "pasteUrl") : t(lang, "pasteLinkedIn")}</span>
            <input
              className={fieldClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
          </label>
          <label>
            <span className={labelClass}>{t(lang, "personName")}</span>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className={labelClass}>{t(lang, "personTitle")}</span>
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="flex items-end">
            <button
              className={isHttpUrl(url) ? primaryButton : quietButton}
              type="button"
              disabled={!kindFromUrl(url) || (kindFromUrl(url) === "url" && !allowUrl)}
              onClick={submitUrl}
            >
              {t(lang, "addLink")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  label,
  empty,
  children,
}: {
  label: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <div className="max-h-40 overflow-y-auto rounded border border-slate-800">
        {empty ? <p className="px-2 py-1 text-xs text-slate-500">—</p> : children}
      </div>
    </div>
  );
}
