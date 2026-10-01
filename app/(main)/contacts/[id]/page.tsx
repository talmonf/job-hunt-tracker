import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { eventFormValues } from "@/lib/events";
import { deleteContact, updateContact } from "@/lib/actions/network";
import { saveEvent } from "@/lib/actions/jobs";
import { toChipLink } from "@/lib/entity-links";
import { PageFrame } from "@/components/chrome";
import { EventForm } from "@/components/event-form";
import { EventHistoryTable } from "@/components/event-history";
import { ContactFields } from "@/components/contact-fields";
import { ContactChip } from "@/components/contact-chip";
import { ContactGoogleLink } from "@/components/contact-google-link";
import { EntityLinksSection } from "@/components/entity-links";
import { MentionText } from "@/components/mention-text";
import { firstParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const { id } = await params;
  const search = await searchParams;
  const [contact, notes, contacts, catalog] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: {
        events: { orderBy: { occurredAt: "desc" } },
        parentLinks: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!contact) notFound();
  const lang = user.uiLanguage;
  const editing = contact.events.find((event) => event.id === firstParam(search.editEvent));
  const localContacts = contacts.map((item) => ({
    id: item.id,
    fullName: item.fullName,
    role: item.role,
    workplace: item.workplace,
    googleResourceName: item.googleResourceName,
    linkedinUrl: item.linkedinUrl,
  }));
  const people = contact.parentLinks.map(toChipLink);
  const googleConnected = Boolean(user.contactsRefreshToken);
  const lookup = { contacts: localContacts, links: people };
  return (
    <PageFrame lang={lang} backHref="/contacts" title={dash(contact.fullName, hide)} description={t(lang, "contactDetailIntro")} search={search}>
      <div className="mb-4 space-y-3">
        <ContactGoogleLink
          lang={lang}
          hide={hide}
          contactId={contact.id}
          fullName={contact.fullName}
          role={contact.role}
          googleResourceName={contact.googleResourceName}
          googleConnected={googleConnected}
        />
        {contact.linkedinUrl ? (
          <ContactChip
            hide={hide}
            link={{ kind: "linkedin", displayName: contact.fullName, title: contact.role, url: contact.linkedinUrl }}
          />
        ) : null}
        {contact.contactDetails || contact.summary ? (
          <div className="space-y-3">
            {contact.contactDetails ? (
              <div>
                <p className="mb-1 text-xs text-slate-300">{t(lang, "preview")}</p>
                <MentionText text={contact.contactDetails} hide={hide} lookup={lookup} />
              </div>
            ) : null}
            {contact.summary ? (
              <div>
                <p className="mb-1 text-xs text-slate-300">{t(lang, "preview")}</p>
                <MentionText text={contact.summary} hide={hide} lookup={lookup} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <ContactFields
        lang={lang}
        action={updateContact}
        contact={contact}
        contactedAt={contact.contactedAt ? dateInputValue(contact.contactedAt, user.timezone) : ""}
        nextActionDate={contact.nextActionDate ? dateInputValue(contact.nextActionDate, user.timezone) : ""}
        localContacts={localContacts}
        googleConnected={googleConnected}
        tags={catalog}
        selectedTagIds={assignmentTags(contact.tags).map((tag) => tag.id)}
        hide={hide}
      />
      <EntityLinksSection
        lang={lang}
        hide={hide}
        links={people}
        parentContactId={contact.id}
        localContacts={localContacts.filter((item) => item.id !== contact.id)}
        googleConnected={googleConnected}
      />
      <h2 className="mb-2 mt-8 text-lg">{t(lang, "logEvent")}</h2>
      <EventForm
        action={saveEvent}
        lang={lang}
        calendarLinked={Boolean(user.calendarRefreshToken)}
        lockLinks
        defaultJobId={editing?.jobId ?? undefined}
        defaultContactId={contact.id}
        jobs={[]}
        contacts={[]}
        notes={notes.map((item) => ({ id: item.id, label: dash(item.title, hide) }))}
        cvs={[]}
        event={editing ? eventFormValues(editing, user.timezone) : undefined}
      />
      <h2 className="mb-2 mt-8 text-lg">{t(lang, "history")}</h2>
      <EventHistoryTable
        lang={lang}
        timezone={user.timezone}
        hide={hide}
        events={contact.events}
        editHref={(eventId) => `/contacts/${contact.id}?editEvent=${eventId}`}
        returnTo={`/contacts/${contact.id}`}
      />
      <form action={deleteContact} className="mt-6">
        <input type="hidden" name="contactId" value={contact.id} />
        <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
      </form>
    </PageFrame>
  );
}
