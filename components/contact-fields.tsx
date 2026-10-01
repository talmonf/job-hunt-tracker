"use client";

import { useState } from "react";
import { CONTACT_STATUSES, isContactStatus, normalizeContactStatus } from "@/lib/contact-status";
import { contactStatusLabel, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { TagRef } from "@/lib/tags";
import { contactDetailsFromPerson, joinPersonName, namePartsFromPerson, splitPersonName } from "@/lib/person-name";
import { DateField, SubmitButton, fieldClass, labelClass, quietButton } from "./widgets";
import { MentionTextarea } from "./mention-textarea";
import { TagPicker } from "./tag-picker";
import { ContactChip } from "./contact-chip";
import { PersonPicker, type LocalPerson, type PickedPerson } from "./person-picker";

export function ContactFields({
  lang,
  action,
  contact,
  contactedAt = "",
  nextActionDate = "",
  localContacts = [],
  googleConnected = false,
  googleAtStart = false,
  tags,
  selectedTagIds = [],
  hide,
}: {
  lang: Lang;
  action: (formData: FormData) => void;
  tags: TagRef[];
  selectedTagIds?: string[];
  hide: boolean;
  contact?: {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    role: string;
    workplace: string;
    howWeMet: string;
    lastChannel: string;
    status: string;
    summary: string;
    nextAction: string;
    contactDetails: string;
    willingToRecommend: boolean;
    linkedinUrl?: string;
    googleResourceName?: string | null;
  };
  contactedAt?: string;
  nextActionDate?: string;
  localContacts?: LocalPerson[];
  googleConnected?: boolean;
  googleAtStart?: boolean;
}) {
  const initialNames = initialPersonName(contact);
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [role, setRole] = useState(contact?.role ?? "");
  const [workplace, setWorkplace] = useState(contact?.workplace ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [contactDetails, setContactDetails] = useState(contact?.contactDetails ?? "");
  const [googleResourceName, setGoogleResourceName] = useState(googleAtStart ? (contact?.googleResourceName ?? "") : "");
  const [googleOpen, setGoogleOpen] = useState(false);

  function applyGoogle(person: PickedPerson) {
    if (person.kind !== "google_contact" || !person.googleResourceName) return;
    const names = namePartsFromPerson({
      givenName: person.givenName ?? "",
      familyName: person.familyName ?? "",
      displayName: person.displayName,
    });
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setRole(person.title);
    setWorkplace(person.workplace ?? "");
    setLinkedinUrl(person.linkedinUrl ?? "");
    setContactDetails(contactDetailsFromPerson({ emails: person.emails ?? [], phones: person.phones ?? [] }));
    setGoogleResourceName(person.googleResourceName);
    setGoogleOpen(false);
  }

  const linkedName = joinPersonName(firstName, lastName);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      {googleAtStart ? (
        <div className="rounded-md border border-slate-700 p-3 md:col-span-2">
          <p className="mb-2 text-sm text-slate-300">{t(lang, "googleContacts")}</p>
          {googleResourceName ? (
            <div className="flex flex-wrap items-center gap-3">
              <ContactChip
                hide={hide}
                link={{
                  kind: "google_contact",
                  displayName: linkedName || firstName || lastName,
                  title: role,
                  googleResourceName,
                }}
              />
              <span className="text-xs text-slate-400">{t(lang, "googleContactLinked")}</span>
              <button className="text-sm text-rose-300" type="button" onClick={() => setGoogleResourceName("")}>
                {t(lang, "unlinkGoogleContact")}
              </button>
            </div>
          ) : googleConnected ? (
            <>
              <button className={quietButton} type="button" onClick={() => setGoogleOpen((value) => !value)}>
                {t(lang, "linkGoogleContact")}
              </button>
              {googleOpen ? (
                <div className="mt-3">
                  <PersonPicker lang={lang} localContacts={[]} googleConnected googleOnly hideUrl onPick={applyGoogle} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-400">{t(lang, "googleContactsHint")}</p>
          )}
          <input type="hidden" name="googleResourceName" value={googleResourceName} />
        </div>
      ) : null}
      <label>
        <span className={labelClass}>{t(lang, "firstName")}</span>
        <input className={fieldClass} name="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "lastName")}</span>
        <input className={fieldClass} name="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "role")}</span>
        <input className={fieldClass} name="role" value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "workplace")}</span>
        <input className={fieldClass} name="workplace" value={workplace} onChange={(event) => setWorkplace(event.target.value)} />
      </label>
      <label><span className={labelClass}>{t(lang, "howWeMet")}</span><input className={fieldClass} name="howWeMet" defaultValue={contact?.howWeMet ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "channel")}</span><input className={fieldClass} name="lastChannel" defaultValue={contact?.lastChannel ?? ""} /></label>
      <label>
        <span className={labelClass}>{t(lang, "status")}</span>
        <select className={fieldClass} name="status" defaultValue={normalizeContactStatus(contact?.status ?? "")}>
          <option value="">{t(lang, "none")}</option>
          {CONTACT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {contactStatusLabel(lang, status)}
            </option>
          ))}
          {contact?.status && !isContactStatus(normalizeContactStatus(contact.status)) ? (
            <option value={contact.status}>{contact.status}</option>
          ) : null}
        </select>
      </label>
      <label className="md:col-start-1"><span className={labelClass}>{t(lang, "contactedAt")}</span><DateField name="contactedAt" defaultValue={contactedAt} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "nextActionDate")}</span><DateField name="nextActionDate" defaultValue={nextActionDate} lang={lang} /></label>
      <label className="md:col-span-2"><span className={labelClass}>{t(lang, "nextAction")}</span><input className={fieldClass} name="nextAction" defaultValue={contact?.nextAction ?? ""} /></label>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "linkedInUrl")}</span>
        <input
          className={fieldClass}
          name="linkedinUrl"
          value={linkedinUrl}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          placeholder="https://www.linkedin.com/in/..."
        />
      </label>
      <div className="md:col-span-2">
        <MentionTextarea
          lang={lang}
          name="contactDetails"
          label={t(lang, "contactDetails")}
          value={contactDetails}
          onValueChange={setContactDetails}
          rows={2}
          localContacts={localContacts}
          googleConnected={googleConnected}
          allowUrl={false}
        />
      </div>
      <div className="md:col-span-2">
        <MentionTextarea
          lang={lang}
          name="summary"
          label={t(lang, "conversation")}
          defaultValue={contact?.summary ?? ""}
          rows={3}
          localContacts={localContacts}
          googleConnected={googleConnected}
          allowUrl={false}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="willingToRecommend" value="1" defaultChecked={contact?.willingToRecommend} />
        {t(lang, "willing")}
      </label>
      <div className="md:col-span-2">
        <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} />
      </div>
      <SubmitButton label={t(lang, "save")} thin />
    </form>
  );
}

function initialPersonName(contact?: { fullName: string; firstName?: string; lastName?: string }) {
  if (!contact) return { firstName: "", lastName: "" };
  if ((contact.firstName ?? "").trim() || (contact.lastName ?? "").trim()) {
    return { firstName: contact.firstName ?? "", lastName: contact.lastName ?? "" };
  }
  return splitPersonName(contact.fullName);
}
