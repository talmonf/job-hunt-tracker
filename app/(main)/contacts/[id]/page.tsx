import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, dateTimeInputValue } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { deleteContact, updateContact } from "@/lib/actions/network";
import { saveEvent } from "@/lib/actions/jobs";
import { PageFrame } from "@/components/chrome";
import { EventForm } from "@/components/event-form";
import { EventHistoryTable } from "@/components/event-history";
import { ContactFields } from "@/components/contact-fields";
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
  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
    include: { events: { orderBy: { occurredAt: "desc" } } },
  });
  if (!contact) notFound();
  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const lang = user.uiLanguage;
  const editing = contact.events.find((event) => event.id === firstParam(search.editEvent));
  return (
    <PageFrame lang={lang} backHref="/contacts" title={dash(contact.fullName, hide)} description={t(lang, "contactDetailIntro")} search={search}>
      <ContactFields
        lang={lang}
        action={updateContact}
        contact={contact}
        contactedAt={contact.contactedAt ? dateInputValue(contact.contactedAt, user.timezone) : ""}
        nextActionDate={contact.nextActionDate ? dateInputValue(contact.nextActionDate, user.timezone) : ""}
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
        event={
          editing
            ? {
                id: editing.id,
                type: editing.type,
                occurredAt: dateTimeInputValue(editing.occurredAt, user.timezone),
                endsAt: editing.endsAt ? dateTimeInputValue(editing.endsAt, user.timezone) : "",
                channel: editing.channel ?? "",
                stage: editing.stage ?? "",
                counterpartyName: editing.counterpartyName,
                summary: editing.summary,
                noteId: editing.noteId ?? "",
                cvId: editing.cvId ?? "",
                tailoredCv: Boolean(editing.tailoredCv),
                resultingStatus: editing.resultingStatus ?? "",
                onCalendar: Boolean(editing.googleCalendarEventId),
              }
            : undefined
        }
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
