import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags, rankByOverlap } from "@/lib/tags";
import { deleteContact, updateContact } from "@/lib/actions/network";
import { toChipLink } from "@/lib/entity-links";
import { PageFrame } from "@/components/chrome";
import { EventHistoryTable } from "@/components/event-history";
import { ContactFields } from "@/components/contact-fields";
import { ContactStatusEditor } from "@/components/contact-inline";
import { EntityLinksSection } from "@/components/entity-links";
import { RelatedByTags } from "@/components/related-tags";
import { SettingsSection } from "@/components/settings-section";

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
  const [contact, notes, contacts, jobs, employments, catalog, companies] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: {
        events: { orderBy: { occurredAt: "desc" } },
        parentLinks: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
        companies: { include: { company: true } },
      },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { fullName: "asc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.employment.findMany({
      where: { userId: user.id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!contact) notFound();
  const lang = user.uiLanguage;
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
  const contactTags = assignmentTags(contact.tags);
  const contactTagIds = contactTags.map((tag) => tag.id);
  const relatedJobs = rankByOverlap(
    jobs,
    (row) => assignmentTags(row.tags),
    contactTagIds,
    (row) => `${row.companyName} ${row.title}`,
  ).map((row) => ({
    id: row.item.id,
    label: row.item.title ? `${row.item.companyName} — ${row.item.title}` : row.item.companyName,
    overlap: row.overlap,
  }));
  const relatedEmployments = rankByOverlap(
    employments,
    (row) => assignmentTags(row.tags),
    contactTagIds,
    (row) => `${row.title} ${row.company}`,
  ).map((row) => ({ id: row.item.id, label: `${row.item.title} · ${row.item.company}`, overlap: row.overlap }));
  const relatedNotes = rankByOverlap(
    notes,
    (row) => assignmentTags(row.tags),
    contactTagIds,
    (row) => row.title,
  ).map((row) => ({ id: row.item.id, label: row.item.title, overlap: row.overlap }));
  const relatedContacts = rankByOverlap(
    contacts.filter((item) => item.id !== contact.id),
    (row) => assignmentTags(row.tags),
    contactTagIds,
    (row) => row.fullName,
  ).map((row) => ({ id: row.item.id, label: row.item.fullName, overlap: row.overlap }));
  const detailItems = [
    contact.role.trim() ? { label: t(lang, "role"), value: dash(contact.role, hide) } : null,
    contact.workplace.trim() ? { label: t(lang, "workplace"), value: dash(contact.workplace, hide) } : null,
    contact.mobile.trim() ? { label: t(lang, "mobile"), value: dash(contact.mobile, hide) } : null,
    contact.email.trim() ? { label: t(lang, "email"), value: dash(contact.email, hide) } : null,
    contact.address.trim() ? { label: t(lang, "address"), value: dash(contact.address, hide) } : null,
    contact.howWeMet.trim() ? { label: t(lang, "howWeMet"), value: dash(contact.howWeMet, hide) } : null,
    contact.lastChannel.trim() ? { label: t(lang, "channel"), value: dash(contact.lastChannel, hide) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const detailSummary = detailItems.length ? (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {detailItems.map((item) => (
        <span key={item.label}>
          <span className="text-slate-500">{item.label} </span>
          {item.value}
        </span>
      ))}
    </span>
  ) : undefined;
  const actionItems = [
    contact.contactedAt ? { label: t(lang, "contactedAt"), value: formatDate(contact.contactedAt, user.timezone) } : null,
    contact.nextActionDate ? { label: t(lang, "nextActionDate"), value: formatDate(contact.nextActionDate, user.timezone) } : null,
    contact.nextAction.trim() ? { label: t(lang, "nextAction"), value: dash(contact.nextAction, hide) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const actionSummary = actionItems.length ? (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {actionItems.map((item) => (
        <span key={item.label}>
          <span className="text-slate-500">{item.label} </span>
          {item.value}
        </span>
      ))}
    </span>
  ) : undefined;
  const contactReturn = `/contacts/${contact.id}`;
  const logHref = `/events?modal=new&presetContact=${encodeURIComponent(contact.id)}&presetNow=1&returnTo=${encodeURIComponent(contactReturn)}`;
  return (
    <PageFrame
      lang={lang}
      backHref="/contacts"
      title={dash(contact.fullName, hide)}
      titleAside={
        <div className="flex flex-wrap items-center gap-2">
          <ContactStatusEditor contactId={contact.id} status={contact.status} lang={lang} fit />
          <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={logHref}>
            {t(lang, "logEvent")}
          </Link>
        </div>
      }
      description={t(lang, "contactDetailIntro")}
      search={search}
    >
      <ContactFields
        lang={lang}
        action={updateContact}
        layout="page"
        contact={contact}
        contactedAt={contact.contactedAt ? dateInputValue(contact.contactedAt, user.timezone) : ""}
        nextActionDate={contact.nextActionDate ? dateInputValue(contact.nextActionDate, user.timezone) : ""}
        localContacts={localContacts}
        mentionLinks={people}
        googleConnected={googleConnected}
        detailSummary={detailSummary}
        actionSummary={actionSummary}
        tags={catalog}
        selectedTagIds={contactTagIds}
        companies={companies}
        selectedCompanies={contact.companies.map((row) => ({
          id: row.company.id,
          name: row.company.name,
          startedOn: row.startedOn,
          startedUnknown: row.startedUnknown,
          endedOn: row.endedOn,
          endedUnknown: row.endedUnknown,
        }))}
        hide={hide}
      />
      <RelatedByTags
        className=""
        showCount
        lang={lang}
        hide={hide}
        hasTags={contactTagIds.length > 0}
        jobs={relatedJobs}
        employments={relatedEmployments}
        notes={relatedNotes}
        contacts={relatedContacts}
      />
      <EntityLinksSection
        lang={lang}
        hide={hide}
        links={people}
        parentContactId={contact.id}
        localContacts={localContacts.filter((item) => item.id !== contact.id)}
        googleConnected={googleConnected}
        title={t(lang, "people")}
        collapsible
      />
      <SettingsSection title={t(lang, "history")} badge={contact.events.length ? String(contact.events.length) : undefined}>
        <EventHistoryTable
          lang={lang}
          timezone={user.timezone}
          hide={hide}
          events={contact.events}
          editHref={`/events?modal=edit&eventId={id}&returnTo=${encodeURIComponent(contactReturn)}`}
          returnTo={contactReturn}
        />
      </SettingsSection>
      <div>
        <form action={deleteContact}>
          <input type="hidden" name="contactId" value={contact.id} />
          <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
        </form>
      </div>
    </PageFrame>
  );
}
