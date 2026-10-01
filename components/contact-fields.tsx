"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CONTACT_STATUSES, isContactStatus, normalizeContactStatus } from "@/lib/contact-status";
import { contactStatusLabel, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { ChipLink } from "@/lib/entity-links";
import type { TagRef } from "@/lib/tags";
import { assignNameByScript, displayPersonName, emptyBilingualName, type BilingualName } from "@/lib/person-name";
import { DateField, SubmitButton, compactFieldClass, compactLabelClass, fieldClass, labelClass, quietButton } from "./widgets";
import { MentionTextarea } from "./mention-textarea";
import { MentionText } from "./mention-text";
import { TagPicker } from "./tag-picker";
import { ContactChip } from "./contact-chip";
import { ContactGoogleLink } from "./contact-google-link";
import { SettingsSection } from "./settings-section";
import { PersonPicker, type LocalPerson, type PickedPerson } from "./person-picker";

export function ContactFields({
  lang,
  action,
  contact,
  contactedAt = "",
  nextActionDate = "",
  localContacts = [],
  mentionLinks = [],
  googleConnected = false,
  googleAtStart = false,
  layout = "form",
  detailSummary,
  actionSummary,
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
    firstNameHe?: string;
    lastNameHe?: string;
    role: string;
    workplace: string;
    howWeMet: string;
    lastChannel: string;
    status: string;
    summary: string;
    nextAction: string;
    contactDetails: string;
    willingToRecommend: boolean;
    mobile?: string;
    email?: string;
    address?: string;
    linkedinUrl?: string;
    googleResourceName?: string | null;
  };
  contactedAt?: string;
  nextActionDate?: string;
  localContacts?: LocalPerson[];
  mentionLinks?: ChipLink[];
  googleConnected?: boolean;
  googleAtStart?: boolean;
  layout?: "form" | "page";
  detailSummary?: ReactNode;
  actionSummary?: ReactNode;
}) {
  const initialNames = initialPersonName(contact);
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [firstNameHe, setFirstNameHe] = useState(initialNames.firstNameHe);
  const [lastNameHe, setLastNameHe] = useState(initialNames.lastNameHe);
  const [nameError, setNameError] = useState(false);
  const [role, setRole] = useState(contact?.role ?? "");
  const [workplace, setWorkplace] = useState(contact?.workplace ?? "");
  const [mobile, setMobile] = useState(contact?.mobile ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [contactDetails, setContactDetails] = useState(contact?.contactDetails ?? "");
  const [googleResourceName, setGoogleResourceName] = useState(googleAtStart ? (contact?.googleResourceName ?? "") : "");
  const [googleOpen, setGoogleOpen] = useState(false);
  const lookup = { contacts: localContacts, links: mentionLinks };

  function applyGoogle(person: PickedPerson) {
    if (person.kind !== "google_contact" || !person.googleResourceName) return;
    setFirstName(person.firstName ?? "");
    setLastName(person.lastName ?? "");
    setFirstNameHe(person.firstNameHe ?? "");
    setLastNameHe(person.lastNameHe ?? "");
    setNameError(false);
    setRole(person.title);
    setWorkplace(person.workplace ?? "");
    setMobile(person.mobile ?? "");
    setEmail(person.email ?? "");
    setAddress(person.address ?? "");
    setLinkedinUrl(person.linkedinUrl ?? "");
    setGoogleResourceName(person.googleResourceName);
    setGoogleOpen(false);
  }

  const linkedName = displayPersonName({ firstName, lastName, firstNameHe, lastNameHe });
  function guardName(event: FormEvent<HTMLFormElement>) {
    if ([firstName, lastName, firstNameHe, lastNameHe].some((value) => value.trim())) return;
    event.preventDefault();
    setNameError(true);
  }
  const nameFields = (
    <>
      <label>
        <span className={labelClass}>{t(lang, "firstNameEn")}</span>
        <input
          className={fieldClass}
          dir="ltr"
          name="firstName"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
            setNameError(false);
          }}
        />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "lastNameEn")}</span>
        <input
          className={fieldClass}
          dir="ltr"
          name="lastName"
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);
            setNameError(false);
          }}
        />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "firstNameHe")}</span>
        <input
          className={fieldClass}
          dir="rtl"
          name="firstNameHe"
          value={firstNameHe}
          onChange={(event) => {
            setFirstNameHe(event.target.value);
            setNameError(false);
          }}
        />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "lastNameHe")}</span>
        <input
          className={fieldClass}
          dir="rtl"
          name="lastNameHe"
          value={lastNameHe}
          onChange={(event) => {
            setLastNameHe(event.target.value);
            setNameError(false);
          }}
        />
      </label>
      {nameError ? <p className="text-sm text-rose-300 md:col-span-2">{t(lang, "errorRequired")}</p> : null}
      <label>
        <span className={labelClass}>{t(lang, "role")}</span>
        <input className={fieldClass} name="role" value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "workplace")}</span>
        <input className={fieldClass} name="workplace" value={workplace} onChange={(event) => setWorkplace(event.target.value)} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "mobile")}</span>
        <input className={fieldClass} dir="ltr" name="mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "email")}</span>
        <input className={fieldClass} dir="ltr" name="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="md:col-span-2">
        <span className={labelClass}>{t(lang, "address")}</span>
        <input className={fieldClass} name="address" value={address} onChange={(event) => setAddress(event.target.value)} />
      </label>
      <label><span className={labelClass}>{t(lang, "howWeMet")}</span><input className={fieldClass} name="howWeMet" defaultValue={contact?.howWeMet ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "channel")}</span><input className={fieldClass} name="lastChannel" defaultValue={contact?.lastChannel ?? ""} /></label>
    </>
  );

  if (layout === "page" && contact) {
    return (
      <form action={action} onSubmit={guardName}>
        <input type="hidden" name="contactId" value={contact.id} />
        <div className="mb-3">
          <TagPicker lang={lang} hide={hide} tags={tags} selected={selectedTagIds} compact />
        </div>
        <SettingsSection title={t(lang, "detailsSection")} summary={detailSummary}>
          <div className="grid gap-3 md:grid-cols-2">
            {nameFields}
            <div className="md:col-span-2">
              <ContactGoogleLink
                lang={lang}
                hide={hide}
                contactId={contact.id}
                fullName={contact.fullName}
                role={contact.role}
                googleResourceName={contact.googleResourceName ?? null}
                googleConnected={googleConnected}
              />
            </div>
            {contact.linkedinUrl ? (
              <div className="md:col-span-2">
                <ContactChip
                  hide={hide}
                  link={{ kind: "linkedin", displayName: contact.fullName, title: contact.role, url: contact.linkedinUrl }}
                />
              </div>
            ) : null}
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
              {contact.contactDetails ? (
                <div className="mb-3">
                  <p className={labelClass}>{t(lang, "preview")}</p>
                  <MentionText text={contact.contactDetails} hide={hide} lookup={lookup} />
                </div>
              ) : null}
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
              {contact.summary ? (
                <div className="mb-3">
                  <p className={labelClass}>{t(lang, "preview")}</p>
                  <MentionText text={contact.summary} hide={hide} lookup={lookup} />
                </div>
              ) : null}
              <MentionTextarea
                lang={lang}
                name="summary"
                label={t(lang, "conversation")}
                defaultValue={contact.summary}
                rows={3}
                localContacts={localContacts}
                googleConnected={googleConnected}
                allowUrl={false}
              />
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title={t(lang, "nextAction")} summary={actionSummary}>
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
            <label className="shrink-0">
              <span className={compactLabelClass}>{t(lang, "contactedAt")}</span>
              <DateField name="contactedAt" defaultValue={contactedAt} lang={lang} compact />
            </label>
            <label className="shrink-0">
              <span className={compactLabelClass}>{t(lang, "nextActionDate")}</span>
              <DateField name="nextActionDate" defaultValue={nextActionDate} lang={lang} compact />
            </label>
            <label className="min-w-[12rem] flex-1">
              <span className={compactLabelClass}>{t(lang, "nextAction")}</span>
              <input className={compactFieldClass} name="nextAction" defaultValue={contact.nextAction} />
            </label>
            <label className="flex items-center gap-2 pb-1 text-sm">
              <input type="checkbox" name="willingToRecommend" value="1" defaultChecked={contact.willingToRecommend} />
              {t(lang, "willing")}
            </label>
            <div className="ms-auto">
              <SubmitButton label={t(lang, "save")} />
            </div>
          </div>
        </SettingsSection>
      </form>
    );
  }

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2" onSubmit={guardName}>
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
      {nameFields}
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

function initialPersonName(contact?: { fullName: string } & Partial<BilingualName>): BilingualName {
  if (!contact) return emptyBilingualName();
  const stored = {
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    firstNameHe: contact.firstNameHe ?? "",
    lastNameHe: contact.lastNameHe ?? "",
  };
  if (Object.values(stored).some((value) => value.trim())) return stored;
  return assignNameByScript(contact.fullName);
}
