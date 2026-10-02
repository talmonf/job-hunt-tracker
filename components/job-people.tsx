"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { chipHref, type ChipLink, type EntityLinkKind } from "@/lib/entity-links";
import { JOB_CONNECTIONS, WORKS_THERE, connectionForWorksThere, type JobConnection, type WorksThere } from "@/lib/job-person";
import { dash } from "@/lib/mask";
import { addEntityLink, deleteEntityLink, updateJobPerson } from "@/lib/actions/links";
import { ContactChip } from "./contact-chip";
import { PersonPicker, type LocalPerson, type PickedPerson } from "./person-picker";
import { SettingsSection } from "./settings-section";
import { SubmitButton, fieldClass, labelClass, primaryButton } from "./widgets";

export type JobPerson = {
  id: string;
  kind: EntityLinkKind;
  displayName: string;
  title: string;
  googleResourceName?: string | null;
  url: string;
  contactId?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  worksThere: string;
  connection: string;
  relationshipNote: string;
};

const MODES = ["google", "networking", "manual"] as const;
type Mode = (typeof MODES)[number];

export function JobPeopleSection({
  lang,
  hide,
  jobId,
  links,
  localContacts,
  googleConnected,
}: {
  lang: Lang;
  hide: boolean;
  jobId: string;
  links: JobPerson[];
  localContacts: LocalPerson[];
  googleConnected: boolean;
}) {
  return (
    <SettingsSection title={t(lang, "people")} badge={String(links.length)}>
      {links.length ? (
        <ul className="mb-4 grid gap-3">
          {links.map((person) => (
            <JobPersonRow key={person.id} lang={lang} hide={hide} person={person} />
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-400">{t(lang, "noJobPeople")}</p>
      )}
      <AddPerson lang={lang} jobId={jobId} localContacts={localContacts} googleConnected={googleConnected} />
    </SettingsSection>
  );
}

function JobPersonRow({ lang, hide, person }: { lang: Lang; hide: boolean; person: JobPerson }) {
  const [worksThere, setWorksThere] = useState(person.worksThere);
  const [connection, setConnection] = useState(person.connection);
  const [note, setNote] = useState(person.relationshipNote);
  const manual = person.kind === "manual";
  const chip: ChipLink = {
    id: person.id,
    kind: person.kind,
    displayName: person.displayName,
    title: person.title,
    googleResourceName: person.googleResourceName,
    url: person.url,
    contactId: person.contactId,
  };
  return (
    <li className="rounded-md border border-slate-700 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {chipHref(chip) ? (
          <ContactChip link={chip} hide={hide} />
        ) : (
          <span className="text-sm text-slate-100">{dash(person.displayName, hide)}</span>
        )}
        {manual ? (
          <a
            className="text-sm text-sky-300 hover:text-sky-200"
            href={`/contacts/new?link=${encodeURIComponent(person.id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(lang, "addToNetworking")}
          </a>
        ) : null}
      </div>
      <form action={updateJobPerson} className="grid gap-3">
        <input type="hidden" name="linkId" value={person.id} />
        {manual ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className={labelClass}>{t(lang, "firstName")}</span>
              <input className={fieldClass} name="firstName" defaultValue={person.firstName} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "lastName")}</span>
              <input className={fieldClass} name="lastName" defaultValue={person.lastName} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "telephone")}</span>
              <input className={fieldClass} name="phone" dir="ltr" defaultValue={person.phone} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "email")}</span>
              <input className={fieldClass} name="email" dir="ltr" defaultValue={person.email} />
            </label>
          </div>
        ) : null}
        <RelationshipFields
          lang={lang}
          worksThere={worksThere}
          connection={connection}
          note={note}
          onWorksThere={setWorksThere}
          onConnection={setConnection}
          onNote={setNote}
        />
        <SubmitButton label={t(lang, "save")} />
      </form>
      <form action={deleteEntityLink} className="mt-2">
        <input type="hidden" name="linkId" value={person.id} />
        <button className="text-sm text-rose-300" type="submit">
          {t(lang, "delete")}
        </button>
      </form>
    </li>
  );
}

function AddPerson({
  lang,
  jobId,
  localContacts,
  googleConnected,
}: {
  lang: Lang;
  jobId: string;
  localContacts: LocalPerson[];
  googleConnected: boolean;
}) {
  const [mode, setMode] = useState<Mode | "">("");
  const [selected, setSelected] = useState<PickedPerson | null>(null);
  const [query, setQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [worksThere, setWorksThere] = useState("");
  const [connection, setConnection] = useState("");
  const [note, setNote] = useState("");
  const q = query.trim().toLowerCase();
  const locals = useMemo(() => {
    const list = q
      ? localContacts.filter((contact) => [contact.fullName, contact.role, contact.workplace ?? ""].join(" ").toLowerCase().includes(q))
      : localContacts;
    return list.slice(0, 8);
  }, [localContacts, q]);
  const ready =
    mode === "manual"
      ? Boolean(firstName.trim() || lastName.trim())
      : mode === "google"
        ? selected?.kind === "google_contact"
        : mode === "networking"
          ? selected?.kind === "local_contact"
          : false;
  const labels: Record<Mode, string> = {
    google: t(lang, "linkGooglePerson"),
    networking: t(lang, "linkNetworkingPerson"),
    manual: t(lang, "enterContactManually"),
  };

  function choose(next: Mode) {
    setMode(next);
    setSelected(null);
  }

  return (
    <div>
      <div className="grid gap-2">
        {MODES.map((item, index) => {
          const on = mode === item;
          return (
            <button
              key={item}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-start text-sm ${on ? "border-sky-500 bg-slate-800 text-slate-100" : "border-slate-700 text-slate-200 hover:bg-slate-800/60"}`}
              type="button"
              aria-pressed={on}
              onClick={() => choose(item)}
            >
              <span className="w-5 shrink-0 text-slate-400">{index + 1}</span>
              {labels[item]}
            </button>
          );
        })}
      </div>
      {mode ? (
        <form action={addEntityLink} className="mt-3 grid gap-3 rounded-md border border-slate-700 p-3">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="kind" value={mode === "manual" ? "manual" : (selected?.kind ?? "")} />
          {mode === "manual" ? null : (
            <>
              <input type="hidden" name="displayName" value={selected?.displayName ?? ""} />
              <input type="hidden" name="title" value={selected?.title ?? ""} />
              <input type="hidden" name="googleResourceName" value={selected?.googleResourceName ?? ""} />
              <input type="hidden" name="contactId" value={selected?.contactId ?? ""} />
              <input type="hidden" name="url" value={selected?.url ?? ""} />
            </>
          )}
          {mode === "google" ? (
            googleConnected ? (
              <PersonPicker lang={lang} localContacts={[]} googleConnected googleOnly hideUrl onPick={setSelected} />
            ) : (
              <div className="grid gap-2 text-sm text-slate-400">
                <p>{t(lang, "googleContactsHint")}</p>
                <Link className="w-fit text-sky-300 underline" href="/settings?section=google#google">
                  {t(lang, "linkGoogleContacts")}
                </Link>
              </div>
            )
          ) : null}
          {mode === "networking" ? (
            <div>
              <label>
                <span className={labelClass}>{t(lang, "networking")}</span>
                <input
                  className={fieldClass}
                  value={query}
                  placeholder={t(lang, "searchPeople")}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                />
              </label>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-800">
                {locals.length ? (
                  locals.map((contact) => {
                    const on = selected?.contactId === contact.id;
                    return (
                      <button
                        key={contact.id}
                        className={`block w-full truncate rounded px-2 py-1 text-start text-sm hover:bg-slate-800 ${on ? "bg-slate-800 text-sky-200" : ""}`}
                        type="button"
                        onClick={() =>
                          setSelected({
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
                    );
                  })
                ) : (
                  <p className="px-2 py-1 text-xs text-slate-500">—</p>
                )}
              </div>
            </div>
          ) : null}
          {mode === "manual" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>{t(lang, "firstName")}</span>
                <input className={fieldClass} name="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>
              <label>
                <span className={labelClass}>{t(lang, "lastName")}</span>
                <input className={fieldClass} name="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>
              <label>
                <span className={labelClass}>{t(lang, "telephone")}</span>
                <input className={fieldClass} name="phone" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label>
                <span className={labelClass}>{t(lang, "email")}</span>
                <input className={fieldClass} name="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            </div>
          ) : null}
          {selected && mode !== "manual" ? (
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">{t(lang, "selectedPerson")} </span>
              {selected.displayName}
            </p>
          ) : null}
          <RelationshipFields
            lang={lang}
            worksThere={worksThere}
            connection={connection}
            note={note}
            onWorksThere={setWorksThere}
            onConnection={setConnection}
            onNote={setNote}
          />
          <AddButton label={t(lang, "addJobPerson")} disabled={!ready} />
        </form>
      ) : null}
    </div>
  );
}

function RelationshipFields({
  lang,
  worksThere,
  connection,
  note,
  onWorksThere,
  onConnection,
  onNote,
}: {
  lang: Lang;
  worksThere: string;
  connection: string;
  note: string;
  onWorksThere: (value: string) => void;
  onConnection: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label>
        <span className={labelClass}>{t(lang, "worksThereQuestion")}</span>
        <select
          className={fieldClass}
          name="worksThere"
          value={worksThere}
          onChange={(event) => {
            const next = event.target.value;
            onWorksThere(next);
            onConnection(connectionForWorksThere(next, connection));
          }}
        >
          <option value="">—</option>
          {WORKS_THERE.map((value) => (
            <option key={value} value={value}>
              {worksThereLabel(lang, value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>{t(lang, "connectionToJob")}</span>
        <select className={fieldClass} name="connection" value={connection} onChange={(event) => onConnection(event.target.value)}>
          <option value="">—</option>
          {JOB_CONNECTIONS.map((value) => (
            <option key={value} value={value}>
              {connectionLabel(lang, value)}
            </option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "jobPersonNote")}</span>
        <textarea className={fieldClass} name="relationshipNote" rows={2} value={note} onChange={(event) => onNote(event.target.value)} />
      </label>
    </div>
  );
}

function AddButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${primaryButton} w-fit`} type="submit" disabled={disabled || pending}>
      {label}
    </button>
  );
}

function worksThereLabel(lang: Lang, value: WorksThere): string {
  if (value === "yes") return t(lang, "yes");
  if (value === "no") return t(lang, "no");
  return t(lang, "inThePast");
}

function connectionLabel(lang: Lang, value: JobConnection): string {
  if (value === "works_there") return t(lang, "worksThereOption");
  if (value === "worked_there") return t(lang, "workedThereOption");
  if (value === "on_the_board") return t(lang, "onTheBoard");
  return t(lang, "providesServices");
}
